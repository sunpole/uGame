import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { createHash, timingSafeEqual } from 'node:crypto';
import { ExpeditionAuthority } from './expedition-authority.mjs';

const statusText = error => ({
  code: Number.isInteger(error?.status)?error.status:500,
  message: error?.status?error.message:'internal-error'
});
function adminMatches(given, expected) {
  if (!expected || !given) return false;
  const a=createHash('sha256').update(given).digest();
  const b=createHash('sha256').update(expected).digest();
  return timingSafeEqual(a,b);
}
async function readBody(req) {
  if(!String(req.headers['content-type']||'').startsWith('application/json')) {
    const e=new Error('json-required');e.status=415;throw e;
  }
  const chunks=[];let size=0;
  for await(const chunk of req) {
    size+=chunk.length;
    if(size>4096){const e=new Error('body-too-large');e.status=413;throw e;}
    chunks.push(chunk);
  }
  try {const parsed=JSON.parse(Buffer.concat(chunks).toString('utf8'));return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:{};}
  catch {const e=new Error('invalid-json');e.status=400;throw e;}
}
const json=(res,status,value)=>{
  res.writeHead(status,{
    'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin'
  });
  res.end(JSON.stringify(value));
};
export function createAuthorityHttpServer({adminKey,storageFile,clock,engine:existingEngine}={}) {
  if(typeof adminKey!=='string'||adminKey.length<24)throw Error('UGAME_EXPEDITION_ADMIN_KEY must be at least 24 characters');
  const file=storageFile?path.resolve(storageFile):path.join(os.homedir(),'.ugame','expedition-authority.local.json');
  fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
  let restored=null;
  if(fs.existsSync(file)) {
    try{restored=JSON.parse(fs.readFileSync(file,'utf8'));}
    catch(error){throw Error('Could not restore expedition authority snapshot: '+error.message);}
  }
  const engine=existingEngine||new ExpeditionAuthority({clock,initialState:restored});
  const persist=()=>{
    const next=file+'.tmp';
    fs.writeFileSync(next,JSON.stringify(engine.snapshot()),{encoding:'utf8',mode:0o600});
    fs.renameSync(next,file);
  };
  const server=http.createServer(async(req,res)=>{
    try{
      const url=new URL(req.url,'http://127.0.0.1');
      const parts=url.pathname.split('/').filter(Boolean);
      if(req.method==='GET' && url.pathname==='/health') {
        return json(res,200,{ok:true,service:'uGame-expedition-authority-dev',maxParticipants:12});
      }
      const bearer=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'').trim();
      if(req.method==='POST' && url.pathname==='/api/rooms'){
        if(!adminMatches(bearer,adminKey))return json(res,401,{error:'admin-unauthorized'});
        const body=await readBody(req);
        const result=engine.createRoom(body);
        persist();
        return json(res,201,result);
      }
      if(parts.length===4 && parts[0]==='api' && parts[1]==='rooms' && parts[3]==='join' && req.method==='POST'){
        const body=await readBody(req);
        const result=engine.join(parts[2],body);
        persist();
        return json(res,201,result);
      }
      if(parts.length===4 && parts[0]==='api' && parts[1]==='rooms' && parts[3]==='status' && req.method==='GET'){
        const result=engine.status(parts[2],bearer);
        persist();
        return json(res,200,result);
      }
      if(parts.length===4 && parts[0]==='api' && parts[1]==='rooms' && parts[3]==='actions' && req.method==='POST'){
        const body=await readBody(req);
        const result=engine.command(parts[2],bearer,body.action);
        persist();
        return json(res,200,result);
      }
      return json(res,404,{error:'route-not-found'});
    }catch(e){const result=statusText(e);return json(res,result.code,{error:result.message});}
  });
  return {server,engine,persist};
}

if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const adminKey=process.env.UGAME_EXPEDITION_ADMIN_KEY;
  const storageFile=process.env.UGAME_EXPEDITION_SAVE_FILE;
  try{
    const {server,engine,persist}=createAuthorityHttpServer({adminKey,storageFile});
    // Only loopback until account identity, HTTPS and user moderation are implemented.
    const port=Number(process.env.UGAME_EXPEDITION_PORT)||5184;
    if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid port');
    server.listen(port,'127.0.0.1',()=>{
      console.log('uGame local expedition authority: http://127.0.0.1:'+port);
      console.log('Only loopback clients. No public hosting or main-game account integration.');
    });
    const task=setInterval(()=>{engine.cleanup();persist();},10_000);
    task.unref();
    process.once('SIGINT',()=>{clearInterval(task);persist();server.close(()=>process.exit(0));});
  }catch(error){console.error(error.message);process.exitCode=1;}
}
