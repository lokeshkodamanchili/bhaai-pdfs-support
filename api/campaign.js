import {endpoint,db,env} from '../lib/server.js';
export default endpoint('GET',async () => {
  const mode = env('RAZORPAY_KEY_ID').startsWith('rzp_test_') ? 'test' : 'live';
  const totals = await db('rpc/campaign_totals',{method:'POST',body:JSON.stringify({payment_mode:mode})});
  const payments = await db(`donations?mode=eq.${mode}&status=eq.captured&select=display_name,amount_paise,refunded_paise,created_at&order=created_at.desc&limit=100`);
  return {goal:40000,mode,...totals,payments};
});
