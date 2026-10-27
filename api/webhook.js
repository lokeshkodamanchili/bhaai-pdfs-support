import {signatureValid,env,syncPayment} from '../lib/server.js';
export const config = {api:{bodyParser:false}};
export default async function handler(req,res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const chunks=[]; let size=0;
    for await (const chunk of req) {size+=chunk.length;if(size>1048576)return res.status(413).end();chunks.push(chunk);}
    const raw=Buffer.concat(chunks);
    if (!signatureValid(raw,req.headers['x-razorpay-signature'],env('RAZORPAY_WEBHOOK_SECRET'))) return res.status(400).json({error:'Invalid signature'});
    const event=JSON.parse(raw.toString('utf8'));
    const paymentId=event.payload?.payment?.entity?.id || event.payload?.refund?.entity?.payment_id;
    if (['payment.captured','order.paid','refund.processed'].includes(event.event) && paymentId) await syncPayment(paymentId);
    return res.status(200).json({received:true});
  } catch {return res.status(503).json({error:'Retry delivery later'});}
}
