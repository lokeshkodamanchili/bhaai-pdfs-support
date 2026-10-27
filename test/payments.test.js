import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {amountToPaise,signatureValid,paymentMatches,syncPayment} from '../lib/server.js';
test('minimum and decimal amounts are enforced on the server',()=>{
 assert.equal(amountToPaise('10'),1000);assert.equal(amountToPaise('10.25'),1025);
 for(const amount of ['9.99','-10','1e3','10.001','NaN','Infinity','1000001'])assert.throws(()=>amountToPaise(amount));
});
test('forged checkout and altered webhook signatures fail',()=>{
 const raw=Buffer.from('{"event":"payment.captured"}'),secret='test-only-secret';
 const signature=createHmac('sha256',secret).update(raw).digest('hex');
 assert.equal(signatureValid(raw,signature,secret),true);
 assert.equal(signatureValid(Buffer.from('altered'),signature,secret),false);
 assert.equal(signatureValid(raw,'invalid',secret),false);
 assert.equal(signatureValid(raw,signature,'wrong-secret'),false);
});
test('only matching, captured INR payments qualify',()=>{
 const order={order_id:'order_123',amount_paise:1000};const p={order_id:'order_123',amount:1000,currency:'INR',status:'captured',captured:true};
 assert.equal(paymentMatches(p,order),true);
 for(const change of [{amount:999},{currency:'USD'},{order_id:'order_other'},{status:'authorized'},{captured:false}])assert.equal(paymentMatches({...p,...change},order),false);
 assert.equal(paymentMatches({...p,status:'refunded'},order),true);
});
test('repeated confirmation updates one donation and full refunds reconcile',async()=>{
 const oldFetch=global.fetch,oldEnv={...process.env};
 process.env.RAZORPAY_KEY_ID='rzp_test_example';process.env.RAZORPAY_KEY_SECRET='test-secret';process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_SECRET_KEY='test-secret';
 const order={order_id:'order_123',amount_paise:1000,mode:'test',status:'pending'};let refunded=0;
 global.fetch=async(url,options)=>{
   if(url.includes('api.razorpay.com'))return new Response(JSON.stringify({id:'pay_123',order_id:'order_123',amount:1000,currency:'INR',captured:true,status:refunded?'refunded':'captured',amount_refunded:refunded}));
   if(options.method==='PATCH'){Object.assign(order,JSON.parse(options.body));return new Response(null,{status:204});}
   return new Response(JSON.stringify([order]));
 };
 try {await syncPayment('pay_123');await syncPayment('pay_123');assert.equal(order.payment_id,'pay_123');assert.equal(order.status,'captured');refunded=1000;await syncPayment('pay_123');assert.equal(order.refunded_paise,1000);}
 finally{global.fetch=oldFetch;process.env=oldEnv;}
});
