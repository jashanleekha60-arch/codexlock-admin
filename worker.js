const cors = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
const json = (data, status=200) => new Response(JSON.stringify(data), {status, headers:cors});
const b64 = s => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
async function sha(s){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function randKey(){const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';const bytes=crypto.getRandomValues(new Uint8Array(20));return 'CL-'+Array.from(bytes,b=>alphabet[b%alphabet.length]).join('').match(/.{1,5}/g).join('-')}
function auth(req,env){const h=req.headers.get('Authorization')||'';if(!h.startsWith('Basic '))return false;try{const decoded=atob(h.slice(6));const i=decoded.indexOf(':');return i>=0&&decoded.slice(0,i)===env.ADMIN_USER&&decoded.slice(i+1)===env.ADMIN_PASSWORD}catch{return false}}
export default { async fetch(req,env){
 const url=new URL(req.url); if(url.pathname==='/'||url.pathname==='/index.html')return env.ASSETS.fetch(req);
 if(!url.pathname.startsWith('/api/'))return json({error:'Not found'},404);
 if(!auth(req,env))return json({error:'Invalid admin login'},401);
 try{
  if(url.pathname==='/api/keys'&&req.method==='GET'){
   const {results}=await env.DB.prepare('SELECT id,label,status,created_at,activated_at,expires_at FROM activation_keys ORDER BY created_at DESC LIMIT 500').all();
   return json({keys:results.map(k=>({id:k.id,label:k.label,status:(k.status==='active'&&k.expires_at<=Date.now())?'expired':k.status,createdAt:k.created_at,activatedAt:k.activated_at,expiresAt:k.expires_at}))});
  }
  if(url.pathname==='/api/keys'&&req.method==='POST'){
   const body=await req.json();const count=Math.max(1,Math.min(25,Number(body.count)||1));const label=String(body.label||'').slice(0,60);const keys=[];
   for(let i=0;i<count;i++){let key=randKey(),hash=await sha(key),id=crypto.randomUUID();await env.DB.prepare('INSERT INTO activation_keys (id,key_hash,label,status,created_at) VALUES (?,?,?,\'unused\',?)').bind(id,hash,label,Date.now()).run();keys.push(key)}
   return json({keys});
  }
  const match=url.pathname.match(/^\/api\/keys\/([\w-]+)$/);
  if(match&&req.method==='DELETE'){const r=await env.DB.prepare("UPDATE activation_keys SET status='revoked' WHERE id=?").bind(match[1]).run();return json({ok:true,changed:r.meta.changes||0})}
  if(url.pathname==='/api/activate'&&req.method==='POST'){
   const body=await req.json();const key=String(body.key||'').trim().toUpperCase();const deviceId=String(body.deviceId||'').slice(0,160);if(!key||!deviceId)return json({ok:false,error:'Key and deviceId required'},400);
   const hash=await sha(key);const row=await env.DB.prepare('SELECT id,status,expires_at,device_id FROM activation_keys WHERE key_hash=?').bind(hash).first();if(!row)return json({ok:false,error:'Invalid key'},404);if(row.status==='revoked')return json({ok:false,error:'Key revoked'},403);
   if(row.status==='active'){if(row.expires_at<=Date.now())return json({ok:false,error:'Subscription expired'},403);if(row.device_id!==deviceId)return json({ok:false,error:'Key already used on another device'},403);return json({ok:true,expiresAt:row.expires_at})}
   if(row.status!=='unused')return json({ok:false,error:'Key unavailable'},403);
   const expires=Date.now()+30*24*60*60*1000;const result=await env.DB.prepare("UPDATE activation_keys SET status='active',activated_at=?,expires_at=?,device_id=? WHERE id=? AND status='unused'").bind(Date.now(),expires,deviceId,row.id).run();if(!(result.meta.changes>0))return json({ok:false,error:'Key already used'},409);return json({ok:true,expiresAt:expires});
  }
  return json({error:'Not found'},404);
 }catch(e){return json({error:'Server error'},500)}
}};
