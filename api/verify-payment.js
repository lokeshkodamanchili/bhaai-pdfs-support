import {endpoint,body,signatureValid,env,syncPayment} from '../lib/server.js';
export default endpoint('POST',async req => {
  const p = body(req);
  if (!/^order_[A-Za-z0-9]+$/.test(p.razorpay_order_id || '') || !/^pay_[A-Za-z0-9]+$/.test(p.razorpay_payment_id || '') || !signatureValid(`${p.razorpay_order_id}|${p.razorpay_payment_id}`,p.razorpay_signature,env('RAZORPAY_KEY_SECRET'))) throw Object.assign(new Error('Payment signature could not be verified.'),{status:400});
  const captured = await syncPayment(p.razorpay_payment_id);
  return {captured};
});
