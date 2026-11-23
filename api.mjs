import bcrypt from 'bcryptjs';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const COOKIE='nexora_admin';
const SESSION_SECONDS=8*60*60;
const required=['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','ADMIN_USERNAME','ADMIN_PASSWORD_HASH','SESSION_SECRET'];
const json=(statusCode,body,headers={})=>({statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers},body:JSON.stringify(body)});
const readBody=e=>{try{return JSON.parse(e.body||'{}')}catch{return {}}};
const safeEqual=(a,b)=>{const x=Buffer.from(String(a));const y=Buffer.from(String(b));return x.length===y.length&&timingSafeEqual(x,y)};
function cookieValue(event){const raw=event.headers?.cookie||event.headers?.Cookie||'';const item=raw.split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='));return item?decodeURIComponent(item.slice(COOKIE.length+1)):''}
function sign(value){return createHmac('sha256',process.env.SESSION_SECRET).update(value).digest('hex')}
function createSession(){const payload=Buffer.from(JSON.stringify({u:process.env.ADMIN_USERNAME,exp:Math.floor(Date.now()/1000)+SESSION_SECONDS,n:randomBytes(12).toString('hex')})).toString('base64url');return `${payload}.${sign(payload)}`}
function validSession(event){try{const token=cookieValue(event);const [payload,signature]=token.split('.');if(!payload||!signature||!safeEqual(signature,sign(payload)))return false;const data=JSON.parse(Buffer.from(payload,'base64url').toString());return data.u===process.env.ADMIN_USERNAME&&data.exp>Math.floor(Date.now()/1000)}catch{return false}}
const cookie=(value,maxAge=SESSION_SECONDS)=>`${COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
async function db(path,options={}){const base=process.env.SUPABASE_URL.replace(/\/$/,'');const r=await fetch(`${base}/rest/v1/${path}`,{...options,headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,'Content-Type':'application/json',Prefer:options.prefer||'return=representation',...(options.headers||{})}});const txt=await r.text();let data;try{data=txt?JSON.parse(txt):null}catch{data=txt}if(!r.ok){console.error('Supabase error',r.status,data);throw new Error('تعذر الاتصال بقاعدة البيانات. راجع إعدادات Supabase.')}return data}
function cleanProduct(p){return {name:String(p.name||'').trim().slice(0,100),price:String(p.price||'').trim().slice(0,60),category:String(p.category||'').trim().slice(0,60),description:String(p.description||'').trim().slice(0,600),image:String(p.image||'').trim().slice(0,1000),active:p.active!==false}}
function validProduct(p){return p.name&&p.price&&p.category&&(!p.image||/^https:\/\//i.test(p.image))}
export async function handler(event){
  if(required.some(k=>!process.env[k]))return json(500,{error:'إعدادات الخادم غير مكتملة. راجع متغيرات Netlify.'});
  const method=event.httpMethod;const path=(event.path||'').replace(/^.*\/api/,'')||'/';
  try{
    if(method==='GET'&&path==='/products'){const products=await db('products?select=*&order=created_at.desc');return json(200,{products})}
    if(method==='GET'&&path==='/settings'){const rows=await db('store_settings?select=key,value');const settings=Object.fromEntries(rows.map(x=>[x.key,x.value]));return json(200,{settings})}
    if(method==='POST'&&path==='/login'){const {username,password}=readBody(event);if(!safeEqual(username||'',process.env.ADMIN_USERNAME)||typeof password!=='string'||!await bcrypt.compare(password,process.env.ADMIN_PASSWORD_HASH))return json(401,{error:'اسم المستخدم أو كلمة المرور غير صحيحة.'});return json(200,{ok:true},{'Set-Cookie':cookie(createSession())})}
    if(method==='POST'&&path==='/logout')return json(200,{ok:true},{'Set-Cookie':cookie('',0)});
    if(method==='GET'&&path==='/session')return validSession(event)?json(200,{authenticated:true}):json(401,{error:'يلزم تسجيل الدخول.'});
    if(!validSession(event))return json(401,{error:'انتهت الجلسة أو يلزم تسجيل الدخول.'});
    if(method==='POST'&&path==='/products'){const p=cleanProduct(readBody(event));if(!validProduct(p))return json(400,{error:'تحقق من الاسم والسعر والتصنيف، ورابط الصورة يجب أن يبدأ بـ https.'});const rows=await db('products',{method:'POST',body:JSON.stringify(p)});return json(201,{product:rows[0]})}
    const productMatch=path.match(/^\/products\/([0-9a-f-]+)$/i);
    if(productMatch&&method==='PUT'){const p=cleanProduct(readBody(event));if(!validProduct(p))return json(400,{error:'بيانات المنتج غير مكتملة أو رابط الصورة غير آمن.'});const rows=await db(`products?id=eq.${encodeURIComponent(productMatch[1])}`,{method:'PATCH',body:JSON.stringify(p)});return json(200,{product:rows[0]||null})}
    if(productMatch&&method==='DELETE'){await db(`products?id=eq.${encodeURIComponent(productMatch[1])}`,{method:'DELETE',prefer:'return=minimal'});return json(200,{ok:true})}
    if(method==='PUT'&&path==='/settings'){const b=readBody(event);const whatsapp=String(b.whatsapp||'').replace(/\D/g,'');if(!/^[0-9]{8,15}$/.test(whatsapp))return json(400,{error:'رقم واتساب لازم يكون أرقام فقط مع رمز الدولة.'});const items=[{key:'title',value:String(b.title||'').slice(0,100)},{key:'subtitle',value:String(b.subtitle||'').slice(0,220)},{key:'whatsapp',value:whatsapp}];for(const item of items)await db('store_settings?on_conflict=key',{method:'POST',body:JSON.stringify(item),prefer:'resolution=merge-duplicates,return=representation'});return json(200,{ok:true})}
    return json(404,{error:'المسار غير موجود.'});
  }catch(error){console.error(error);return json(500,{error:error.message||'حدث خطأ في الخادم.'})}
}
