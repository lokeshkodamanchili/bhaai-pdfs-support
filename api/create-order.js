import {randomUUID} from 'node:crypto';
import {endpoint,body,validatePaise,db,createRazorOrder,env} from '../lib/server.js';
export default endpoint('POST', async req => {
  const data = body(req);
  const name = String(data.name || '').trim();
  if (!name || name.length > 60) throw Object.assign(new Error('Enter a display name of 1–60 characters.'),{status:400});
  const amount = validatePaise(data.amount);
  if (data.currency && data.currency !== 'INR') throw Object.assign(new Error('Only INR is supported.'),{status:400});
  const mode = env('RAZORPAY_KEY_ID').startsWith('rzp_test_') ? 'test' : 'live';
  // Check database configuration before creating an external order.
  await db('donations?select=order_id&limit=1');
  const order = await createRazorOrder({amount,currency:'INR',receipt:randomUUID(),notes:{campaign:'bhaai-pdfs-support'}});
  await db('donations',{method:'POST',body:JSON.stringify({order_id:order.id,display_name:name,amount_paise:amount,mode})});
  return {order_id:order.id,amount:order.amount,currency:order.currency,key:env('RAZORPAY_KEY_ID'),mode};
});
