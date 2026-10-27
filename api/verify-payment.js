import {endpoint,body,signatureValid,env,syncPayment,db} from '../lib/server.js';
export default endpoint('POST',async req => {
  const p = body(req);
  if (!p.razorpay_order_id || !p.razorpay_payment_id || !p.razorpay_signature) throw Object.assign(new Error('Payment ID, order ID and signature are required.'),{status:400});
  if (!/^order_[A-Za-z0-9]+$/.test(p.razorpay_order_id) || !/^pay_[A-Za-z0-9]+$/.test(p.razorpay_payment_id)) throw Object.assign(new Error('Invalid order or payment ID.'),{status:400});
  const [order] = await db(`donations?order_id=eq.${p.razorpay_order_id}&select=order_id`);
  if (!order) throw Object.assign(new Error('Order not found.'),{status:400});
  // Use the order recorded by the backend, never an untrusted replacement ID.
  if (!signatureValid(`${order.order_id}|${p.razorpay_payment_id}`,p.razorpay_signature,env('RAZORPAY_KEY_SECRET'))) throw Object.assign(new Error('Payment signature could not be verified.'),{status:400});
  const captured = await syncPayment(p.razorpay_payment_id,order.order_id);
  return {success:true,captured};
});
