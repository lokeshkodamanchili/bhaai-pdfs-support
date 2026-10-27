import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {amountToPaise,validatePaise,body,signatureValid,paymentMatches,syncPayment} from '../lib/server.js';
test('minimum and decimal amounts are enforced on the server',()=>{
 assert.equal(amountToPaise('1'),100);assert.equal(amountToPaise('10'),1000);assert.equal(amountToPaise('10.25'),1025);
 for(const amount of ['0.99','-10','1e3','10.001','NaN','Infinity','1000001'])assert.throws(()=>amountToPaise(amount));
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

test('API amounts are integer paise and malformed JSON is rejected',()=>{
 assert.equal(validatePaise(100),100);assert.equal(validatePaise(1000),1000);
 for(const value of [99,0,-100,100.5,'100',null])assert.throws(()=>validatePaise(value),e=>e.status===400);
 for(const value of ['{',null,[]])assert.throws(()=>body({body:value}),e=>e.status===400);
});
test('verification refuses missing fields without contacting providers',async()=>{
 const {default:handler}=await import('../api/verify-payment.js');
 let status,result;const res={setHeader(){},status(value){status=value;return this;},json(value){result=value;return this;}};
 await handler({method:'POST',body:{}},res);assert.equal(status,400);assert.match(result.error,/required/);
});
test('signature mismatch returns 400 and cannot mark a donation paid',async()=>{
 const {default:handler}=await import('../api/verify-payment.js');
 const oldFetch=global.fetch,oldEnv={...process.env};let requests=0,status;
 process.env.SUPABASE_SECRET_KEY='unit-test-only';process.env.SUPABASE_URL='https://example.supabase.co';process.env.RAZORPAY_KEY_SECRET='unit-test-only';
 global.fetch=async()=>{requests++;return new Response(JSON.stringify([{order_id:'order_123'}]));};
 const res={setHeader(){},status(value){status=value;return this;},json(){return this;}};
 try{await handler({method:'POST',body:{razorpay_order_id:'order_123',razorpay_payment_id:'pay_123',razorpay_signature:'0'.repeat(64)}},res);assert.equal(status,400);assert.equal(requests,1);}
 finally{global.fetch=oldFetch;process.env=oldEnv;}
});
