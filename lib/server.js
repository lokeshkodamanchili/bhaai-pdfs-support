import { createHmac, timingSafeEqual } from 'node:crypto';
import Razorpay from 'razorpay';

export const env = name => {
  const value = process.env[name];
  if (!value) throw Object.assign(new Error('Server configuration is incomplete.'), { status: 503 });
  return value;
};
export function signatureValid(body, signature, secret) {
  if (typeof signature !== 'string' || !/^[a-f0-9]{64}$/.test(signature)) return false;
  return timingSafeEqual(Buffer.from(signature, 'hex'), createHmac('sha256', secret).update(body).digest());
}
export function amountToPaise(value) {
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(String(value))) throw Object.assign(new Error('Enter a valid amount in rupees.'), {status:400});
  const amount = Math.round(Number(value) * 100);
  if (!Number.isSafeInteger(amount) || amount < 100 || amount > 100000000) throw Object.assign(new Error('Enter an amount between ₹1 and ₹10,00,000.'), {status:400});
  return amount;
}
export function paymentMatches(payment, order) {
  return payment.order_id === order.order_id && payment.currency === 'INR' && payment.amount === order.amount_paise && ['captured','refunded'].includes(payment.status) && payment.captured === true;
}
export async function db(path, options = {}) {
  const key = env('SUPABASE_SECRET_KEY');
  const response = await fetch(`${env('SUPABASE_URL')}/rest/v1/${path}`, {
    ...options, headers: {apikey:key, Authorization:`Bearer ${key}`, 'Content-Type':'application/json', ...options.headers}, signal:AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error('Database request failed. Check the SQL setup and server settings.');
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
export function validatePaise(amount) {
  if (!Number.isSafeInteger(amount) || amount < 100 || amount > 100000000) throw Object.assign(new Error('Amount must be an integer between 100 and 100000000 paise.'), {status:400});
  return amount;
}
export async function createRazorOrder(data) {
  const client = new Razorpay({key_id:env('RAZORPAY_KEY_ID'),key_secret:env('RAZORPAY_KEY_SECRET')});
  try { return await client.orders.create(data); }
  catch (error) {
    const status = error.statusCode === 401 ? 401 : 500;
    throw Object.assign(new Error(status === 401 ? 'Payment provider authentication failed. Check server API credentials.' : 'Payment provider could not create the order. Please try again.'), {status});
  }
}
export async function razor(path, options = {}) {
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, {...options, headers:{Authorization:`Basic ${Buffer.from(`${env('RAZORPAY_KEY_ID')}:${env('RAZORPAY_KEY_SECRET')}`).toString('base64')}`, 'Content-Type':'application/json'}, signal:AbortSignal.timeout(12000)});
  if (!response.ok) throw Object.assign(new Error(response.status === 401 ? 'Payment provider authentication failed.' : 'Payment provider request failed. Please try again.'), {status:response.status === 401 ? 401 : 500});
  return response.json();
}
export async function syncPayment(id, expectedOrderId) {
  if (!/^pay_[A-Za-z0-9]+$/.test(id || '')) throw Object.assign(new Error('Invalid payment ID.'), {status:400});
  const p = await razor(`payments/${id}`);
  if (expectedOrderId && p.order_id !== expectedOrderId) throw Object.assign(new Error('Payment does not belong to this order.'), {status:400});
  if (!/^order_[A-Za-z0-9]+$/.test(p.order_id || '')) return false;
  const [order] = await db(`donations?order_id=eq.${p.order_id}&select=*`);
  if (!order) return false; // Ignore unrelated payments in the merchant account.
  if (order.mode !== (env('RAZORPAY_KEY_ID').startsWith('rzp_test_') ? 'test' : 'live')) return false;
  if (!paymentMatches(p, order)) return false;
  await db(`donations?order_id=eq.${p.order_id}`, {method:'PATCH', body:JSON.stringify({payment_id:p.id,status:'captured',refunded_paise:p.amount_refunded || 0})});
  return true;
}
export function body(req) {
  try {
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
    return data;
  } catch { throw Object.assign(new Error('A valid JSON object is required.'), {status:400}); }
}
export function endpoint(method, run) {
  return async (req,res) => {
    res.setHeader('Cache-Control','no-store');
    if (req.method !== method) { res.setHeader('Allow',method); return res.status(405).json({error:'Method not allowed.'}); }
    try { return res.status(200).json(await run(req)); }
    catch (error) { return res.status(error.status || 500).json({error:error.status ? error.message : 'Unable to complete this request. Please try again shortly.'}); }
  };
}
