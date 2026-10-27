const $ = id => document.getElementById(id);
let rating=0, chart, reviewLoaded=false, checkoutOpen=false;
const money=paise=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:0,maximumFractionDigits:2}).format(paise/100);
async function api(path,data){
  const response=await fetch(`/api/${path}`,{method:data?'POST':'GET',headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined});
  const result=await response.json();if(!response.ok)throw new Error(result.error || 'Request failed. Please try again.');return result;
}
function message(id,text,error=false){$(id).textContent=text;$(id).classList.toggle('error',error);}
function route(){
 const name=['home','payments','reviews','policies'].includes(location.hash.slice(1))?location.hash.slice(1):'home';
 for(const page of ['home','payments','reviews','policies'])$(page+'Page').hidden=page!==name;
 document.querySelectorAll('nav a').forEach(a=>{if(a.hash==='#'+name)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 if(name==='reviews'&&!reviewLoaded)loadReviews();
 if(name==='payments')loadCampaign();
 window.scrollTo({top:0,behavior:'instant'});
}
window.addEventListener('hashchange',route);
function paymentRow(p){
 const row=document.createElement('div');row.className='payment-row';
 const avatar=document.createElement('div');avatar.className='fi-avatar';avatar.textContent=p.display_name.slice(0,1).toUpperCase();
 const meta=document.createElement('div'),name=document.createElement('strong'),date=document.createElement('time');name.textContent=p.display_name;date.dateTime=p.created_at;date.textContent=new Date(p.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});meta.append(name,date);
 const amount=document.createElement('div');amount.className='payment-amount';amount.textContent=money(p.amount_paise-p.refunded_paise);
 if(p.refunded_paise){const note=document.createElement('small');note.textContent=`${money(p.refunded_paise)} refunded`;amount.append(note);}
 row.append(avatar,meta,amount);return row;
}
async function loadCampaign(){try{
 const data=await api('campaign');const percent=Math.min(100,Math.round(data.raised/data.goal*100));
 $('raised').textContent=money(data.raised);$('progressFill').style.width=percent+'%';$('progress').setAttribute('aria-valuenow',Math.min(400,data.raised/100));$('progressPercent').textContent=percent+'%';$('supporterCount').textContent=`${data.count} contribution${data.count===1?'':'s'}`;
 $('modeBanner').textContent=data.mode==='test'?'TEST MODE — Practice checkout only. No real money is collected.':'Independent student initiative · Contributions from ₹10';
 message('campaignStatus',data.raised>=data.goal?'Goal reached — thank you! Further support goes towards the same renewal purpose.':'');
 $('paymentsList').replaceChildren(...data.payments.map(paymentRow));if(!data.payments.length)$('paymentsList').textContent='No verified contributions yet. Be the first to support the next chapter.';
 }catch{message('campaignStatus','Progress is temporarily unavailable. Please refresh shortly.',true);$('modeBanner').textContent='Campaign connection unavailable — payment setup may still be pending.';$('paymentsList').textContent='Unable to load payments. Please try Refresh.';}}
$('refreshPayments').addEventListener('click',loadCampaign);
function updateAmount(){const value=$('amount').value;document.querySelectorAll('[data-amount]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.amount)===Number(value))));$('donateBtn').querySelector('span').textContent=`Contribute ${money(Math.round(Number(value||0)*100))}`;}
document.querySelectorAll('[data-amount]').forEach(b=>b.addEventListener('click',()=>{$('amount').value=b.dataset.amount;updateAmount();}));$('amount').addEventListener('input',updateAmount);
$('donationForm').addEventListener('submit',async e=>{
 e.preventDefault();if(checkoutOpen)return;const button=$('donateBtn');button.disabled=true;message('donationMessage','Preparing your checkout…');
 try {
 if(!window.Razorpay)throw new Error('Checkout could not load. Check your connection and refresh.');
 const order=await api('create-order',{name:$('donorName').value.trim(),amount:Math.round(Number($('amount').value)*100),currency:'INR'});checkoutOpen=true;
 const checkout=new Razorpay({key:order.key,amount:order.amount,currency:order.currency,order_id:order.order_id,name:'Bhaai PDFs',description:'Study PDFs · Subscription renewal support',image:location.origin+'/logo.jpeg',prefill:{name:$('donorName').value.trim()},theme:{color:'#ff6b35'},modal:{ondismiss(){checkoutOpen=false;button.disabled=false;message('donationMessage','Checkout closed. If you paid, verification may take a moment; check Payments before trying again.');}},handler:async response=>{
 checkoutOpen=false;
 try{const result=await api('verify-payment',response);if(result.captured){$('amount').value='10';updateAmount();}
   message('donationMessage',result.captured?'Thank you! Your verified contribution is listed on Payments.':'Payment received by checkout; capture is pending. Your entry will appear after verification.');await loadCampaign();}
 catch{message('donationMessage','Verification is pending. Keep your payment reference and check Payments shortly before trying again.',true);}finally{button.disabled=false;}
 }});
 checkout.on('payment.failed',()=>{message('donationMessage','Payment attempt failed. You can retry in checkout or close it.',true);});checkout.open();message('donationMessage','Complete your contribution in the Razorpay checkout.');
 }catch(error){checkoutOpen=false;button.disabled=false;message('donationMessage',error.message,true);}
});
const words=['Select a rating','Poor','Fair','Good','Great','Excellent!'];
const stars=[...document.querySelectorAll('.star-btn')];
function setRating(value){rating=value;stars.forEach((s,i)=>{s.classList.toggle('active',i<rating);s.setAttribute('aria-pressed',String(i+1===rating));});$('starHint').textContent=words[value];}
stars.forEach((s,i)=>{s.addEventListener('click',()=>setRating(i+1));s.addEventListener('mouseenter',()=>{stars.forEach((b,j)=>b.classList.toggle('lit',j<=i));$('starHint').textContent=words[i+1];});s.addEventListener('mouseleave',()=>{stars.forEach(b=>b.classList.remove('lit'));$('starHint').textContent=words[rating];});});setRating(0);
$('feedback').addEventListener('input',()=>{$('charCount').textContent=`${$('feedback').value.length} / 500`;});
function toast(text,error=false){$('toast').textContent=text;$('toast').className=`toast visible ${error?'error':'success'}`;}
$('submitBtn').addEventListener('click',async()=>{
 const text=$('feedback').value.trim();if(!rating)return toast('Please choose a star rating.',true);if(text.length<5)return toast('Please write at least five characters.',true);
 $('submitBtn').disabled=true;
 try{await api('reviews',{name:$('name').value,rating,text});$('name').value='';$('feedback').value='';$('charCount').textContent='0 / 500';setRating(0);toast('Thank you for sharing your feedback!');await loadReviews();}catch(error){toast(error.message,true);}finally{$('submitBtn').disabled=false;}
});
async function loadReviews(){try{
 const data=await api('reviews');reviewLoaded=true;const {total,average,counts}=data.stats;
 $('avgStat').textContent=total?`${average}★`:'—';$('totalStat').textContent=total;$('topStat').textContent=total?`${counts.indexOf(Math.max(...counts))+1}★`:'—';$('countBadge').textContent=total;
 $('feedbackList').replaceChildren();for(const r of data.reviews){
 const card=document.createElement('article');card.className='fi';
 const top=document.createElement('div');top.className='fi-top';const avatar=document.createElement('div');avatar.className='fi-avatar';avatar.style.setProperty('--hue',r.name.charCodeAt(0)*37%360);avatar.textContent=r.name[0].toUpperCase();
 const meta=document.createElement('div');meta.className='fi-meta';const name=document.createElement('span');name.className='fi-name';name.textContent=r.name;const score=document.createElement('span');score.className='fi-stars';score.textContent='★'.repeat(r.rating)+'☆'.repeat(5-r.rating);score.setAttribute('aria-label',`${r.rating} out of 5 stars`);meta.append(name,score);top.append(avatar,meta);
 const text=document.createElement('p');text.className='fi-text';text.textContent=r.text;const bar=document.createElement('div');bar.className='fi-rating-bar';const fill=document.createElement('div');fill.className='fi-rating-fill';fill.style.width=r.rating*20+'%';bar.append(fill);card.append(top,text,bar);$('feedbackList').append(card);
 }if(!data.reviews.length)$('feedbackList').textContent='No reviews yet — share your experience!';
 if(window.Chart){if(chart){chart.data.datasets[0].data=counts;chart.update();}else chart=new Chart($('chart'),{type:'bar',data:{labels:['1★','2★','3★','4★','5★'],datasets:[{label:'Responses',data:counts,backgroundColor:['#ff6b3550','#ff6b3570','#ffc84570','#00d4aa70','#00d4aab0'],borderColor:['#ff6b35','#ff6b35','#ffc845','#00d4aa','#00d4aa'],borderWidth:1.5,borderRadius:8}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#a8a1aa'},grid:{display:false}},y:{beginAtZero:true,ticks:{precision:0,color:'#a8a1aa'},grid:{color:'#ffffff0d'}}}}});}
 }catch{$('feedbackList').textContent='Reviews are temporarily unavailable. Reopen this page to retry.';}}
route();loadCampaign();setInterval(()=>{if(!document.hidden)loadCampaign();},30000);
