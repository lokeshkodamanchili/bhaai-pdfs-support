import {body,db} from '../lib/server.js';
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  try {
    if (req.method === 'GET') {
      const [reviews,stats] = await Promise.all([db('reviews?select=name,rating,text,created_at&order=created_at.desc&limit=100'),db('rpc/review_totals',{method:'POST',body:'{}'})]);
      return res.status(200).json({reviews,stats});
    }
    if (req.method !== 'POST') {res.setHeader('Allow','GET, POST');return res.status(405).json({error:'Method not allowed.'});}
    const data = body(req), name = String(data.name || '').trim() || 'Anonymous', text = String(data.text || '').trim();
    if (data.website || name.length > 60 || !Number.isInteger(data.rating) || data.rating < 1 || data.rating > 5 || text.length < 5 || text.length > 500) return res.status(400).json({error:'Choose 1–5 stars and write 5–500 characters. Names must be under 61 characters.'});
    await db('reviews',{method:'POST',body:JSON.stringify({name,rating:data.rating,text})});
    return res.status(200).json({saved:true});
  } catch {return res.status(503).json({error:'Reviews are unavailable. Please try again shortly.'});}
}
