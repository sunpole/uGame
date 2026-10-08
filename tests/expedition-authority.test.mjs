import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ExpeditionAuthority } from '../server/expedition-authority.mjs';
import { createAuthorityHttpServer } from '../server/expedition-authority-server.mjs';

function fixture() {
  let at=1000,i=0;
  const clock=()=>at;
  const engine=new ExpeditionAuthority({clock,makeId:()=>('local-token-'+(++i))});
  const move=(ms)=>{at+=ms;};
  return {engine,clock,move};
}
const join=(engine,roomId,code,name)=>engine.join(roomId,{inviteCode:code,displayName:name});

test('12 actual server-side sessions can join a shared finite room; thirteenth is rejected',()=>{
  const {engine}=fixture();
  const room=engine.createRoom({stockUnits:100});
  const sessions=[];
  for(let n=0;n<12;n++)sessions.push(join(engine,room.roomId,room.inviteCode,'Участник '+(n+1)));
  assert.equal(sessions.length,12);
  assert.equal(new Set(sessions.map(x=>x.participantId)).size,12);
  assert.throws(()=>join(engine,room.roomId,room.inviteCode,'13'),/room-full/);
  assert.throws(()=>join(engine,room.roomId,'wrong','Ошибка'),/room-full|invite-invalid/);
  const snap=engine.status(room.roomId,sessions[0].sessionToken);
  assert.equal(snap.participants.length,12);
  assert.equal(snap.maxParticipants,12);
  assert.equal(snap.stockUnits,100);
  assert.equal(snap.me.steps,1000);
  assert.ok(!JSON.stringify(snap).includes('tokenHash'));
});
test('invalid invitations and participant credentials are rejected before any extraction',()=>{
  const {engine}=fixture();
  const room=engine.createRoom({});
  assert.throws(()=>join(engine,room.roomId,'invalid','Хакер'),/invite-invalid/);
  assert.throws(()=>engine.status(room.roomId,'other-token'),/session-invalid/);
  assert.throws(()=>engine.command(room.roomId,'other-token','auto'),/session-invalid/);
  assert.equal(engine.room(room.roomId).participants.length,0);
});
test('two auto miners share one authoritative stock fairly across concurrent offline cycles',()=>{
  const {engine,move}=fixture();
  const room=engine.createRoom({stockUnits:40});
  const a=join(engine,room.roomId,room.inviteCode,'Первый');
  const b=join(engine,room.roomId,room.inviteCode,'Второй');
  engine.command(room.roomId,a.sessionToken,'auto');
  engine.command(room.roomId,b.sessionToken,'auto');
  move(20_000);
  const status=engine.status(room.roomId,a.sessionToken);
  assert.equal(status.stockUnits,32);
  assert.equal(status.participants[0].extractedUnits,4);
  assert.equal(status.participants[1].extractedUnits,4);
  assert.equal(status.me.steps,996);
  const stable=engine.status(room.roomId,b.sessionToken);
  assert.equal(stable.stockUnits,32);
  assert.equal(stable.me.extractedUnits,4);
  assert.equal(stable.rankings.length,0);
});
test('manual precision uses server time rather than client-supplied accuracy and prevents early click',()=>{
  const {engine,move}=fixture();
  const room=engine.createRoom({stockUnits:20});
  const session=join(engine,room.roomId,room.inviteCode,'Умелый');
  engine.command(room.roomId,session.sessionToken,'manual-start');
  move(100);
  assert.throws(()=>engine.command(room.roomId,session.sessionToken,'manual-stop'),/too-early/);
  move(400);
  const result=engine.command(room.roomId,session.sessionToken,'manual-stop');
  assert.deepEqual(result,{ok:true,allocatedUnits:5,result:'точно'});
  const status=engine.status(room.roomId,session.sessionToken);
  assert.equal(status.me.extractedUnits,5);
  assert.equal(status.me.steps,998);
  assert.equal(status.participants[0].manualHits,1);
});
test('room depletion ranks miners and refunds only their own spent Steps once',()=>{
  const {engine,move}=fixture();
  const room=engine.createRoom({stockUnits:10});
  const a=join(engine,room.roomId,room.inviteCode,'A');
  const b=join(engine,room.roomId,room.inviteCode,'B');
  engine.command(room.roomId,a.sessionToken,'auto');
  engine.command(room.roomId,b.sessionToken,'auto');
  move(30_000);
  const result=engine.status(room.roomId,a.sessionToken);
  assert.equal(result.status,'depleted');
  assert.equal(result.stockUnits,0);
  assert.equal(result.participants.reduce((sum,x)=>sum+x.extractedUnits,0),10);
  assert.equal(result.rankings.length,2);
  const first=engine.command(room.roomId,a.sessionToken,'claim');
  assert.equal(first.ok,true);
  assert.equal(first.alreadyClaimed,false);
  assert.equal(first.cargoUnits,result.participants[0].extractedUnits);
  const duplicate=engine.command(room.roomId,a.sessionToken,'claim');
  assert.equal(duplicate.alreadyClaimed,true);
  assert.equal(duplicate.cargoUnits,0);
  assert.equal(engine.status(room.roomId,a.sessionToken).stockUnits,0);
});
test('leaving early forfeits rank refund but preserves cargo when room later ends',()=>{
  const {engine,move}=fixture();
  const room=engine.createRoom({stockUnits:12});
  const a=join(engine,room.roomId,room.inviteCode,'A');
  const b=join(engine,room.roomId,room.inviteCode,'B');
  engine.command(room.roomId,a.sessionToken,'auto');
  engine.command(room.roomId,b.sessionToken,'auto');
  move(10_000);
  engine.status(room.roomId,a.sessionToken);
  const exit=engine.command(room.roomId,a.sessionToken,'leave');
  assert.equal(exit.cargoUnits,2);
  move(60_000);
  const status=engine.status(room.roomId,a.sessionToken);
  assert.equal(status.me.refundSteps,0);
  const claim=engine.command(room.roomId,a.sessionToken,'claim');
  assert.equal(claim.cargoUnits,2);
  assert.equal(claim.refundSteps,0);
});
test('snapshot persistence preserves room, hashed member tokens, finite stock and one-shot claim',()=>{
  const {engine,move}=fixture();
  const room=engine.createRoom({stockUnits:2});
  const a=join(engine,room.roomId,room.inviteCode,'Единственный');
  engine.command(room.roomId,a.sessionToken,'auto');
  move(10_000);
  engine.status(room.roomId,a.sessionToken);
  const snap=engine.snapshot();
  assert.equal(snap.rooms[0].status,'depleted');
  assert.ok(!JSON.stringify(snap).includes(a.sessionToken));
  const next=new ExpeditionAuthority({clock:()=>100_000,initialState:snap});
  assert.equal(next.status(room.roomId,a.sessionToken).stockUnits,0);
  assert.equal(next.command(room.roomId,a.sessionToken,'claim').cargoUnits,2);
  assert.equal(next.command(room.roomId,a.sessionToken,'claim').cargoUnits,0);
});
test('loopback HTTP server enforces admin and invite secrets, persists sessions and replies with no-store',async()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'ugame-authority-'));
  const storageFile=path.join(directory,'authority.json');
  const adminKey='test-secret-for-local-development-only';
  const {server}=createAuthorityHttpServer({adminKey,storageFile});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address();
  const base='http://127.0.0.1:'+address.port;
  const post=(url,body,token='')=>fetch(base+url,{
    method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},
    body:JSON.stringify(body)
  });
  try {
    const health=await fetch(base+'/health');
    assert.equal(health.status,200);
    assert.equal(health.headers.get('cache-control'),'no-store');
    assert.equal((await post('/api/rooms',{stockUnits:20})).status,401);
    const create=await post('/api/rooms',{stockUnits:20},adminKey);
    assert.equal(create.status,201);
    const room=await create.json();
    assert.equal((await post('/api/rooms/'+room.roomId+'/join',{inviteCode:'bad'})).status,403);
    const joining=await post('/api/rooms/'+room.roomId+'/join',{
      inviteCode:room.inviteCode,displayName:'Тестовый игрок'
    });
    assert.equal(joining.status,201);
    const member=await joining.json();
    assert.equal((await fetch(base+'/api/rooms/'+room.roomId+'/status')).status,401);
    const status=await fetch(base+'/api/rooms/'+room.roomId+'/status',{
      headers:{Authorization:'Bearer '+member.sessionToken}
    });
    assert.equal(status.status,200);
    assert.equal((await status.json()).participants.length,1);
    assert.equal(fs.existsSync(storageFile),true);
    const save=JSON.parse(fs.readFileSync(storageFile,'utf8'));
    assert.ok(!JSON.stringify(save).includes(member.sessionToken));
  } finally {
    await new Promise(resolve=>server.close(resolve));
    fs.rmSync(directory,{recursive:true,force:true});
  }
});
