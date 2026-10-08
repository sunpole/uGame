import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';

const id = (size = 16) => randomBytes(size).toString('hex');
const hash = value => createHash('sha256').update(String(value)).digest('hex');
const bounded = (x,min,max,fallback) => Number.isSafeInteger(Number(x))
  ? Math.min(max,Math.max(min,Number(x))) : fallback;
const clone = obj => structuredClone(obj);
const active = r => r.status === 'active';
const cycleMs = 10_000;
const rankRefundPercent = rank => [0,18,10,5][rank] || 0;
function error(message,code=400) {
  const e=new Error(message);e.status=code;return e;
}
export class ExpeditionAuthority {
  constructor({clock=()=>Date.now(),makeId=id,initialState=null}={}) {
    this.clock=clock;
    this.makeId=makeId;
    this.rooms = new Map();
    if (initialState?.rooms) {
      for (const raw of initialState.rooms) {
        if (!raw || typeof raw.id!=='string' || !Array.isArray(raw.participants)) continue;
        this.rooms.set(raw.id,clone(raw));
      }
    }
  }
  snapshot() {return {schemaVersion:1,rooms:clone([...this.rooms.values()])};}
  createRoom({resourceId='stone',tier='T1',stockUnits=100,ttlSeconds=3600}={}) {
    if(this.rooms.size>=200)throw error('room-limit',429);
    if(!['stone','wood','water','clay'].includes(resourceId))throw error('resource-invalid');
    if(!/^T[1-8]$/.test(tier))throw error('tier-invalid');
    const now=this.clock();
    const inviteCode=this.makeId(12);
    const room={
      id:this.makeId(12),resourceId,tier,
      status:'active',createdAt:now,expiresAt:now+bounded(ttlSeconds,60,7200,3600)*1000,
      stockUnits:bounded(stockUnits,1,50_000,100),
      initialUnits:bounded(stockUnits,1,50_000,100),
      inviteHash:hash(inviteCode),
      participants:[],rankings:[],finishedAt:0
    };
    this.rooms.set(room.id,room);
    return {roomId:room.id,inviteCode,expiresAt:room.expiresAt,stockUnits:room.stockUnits};
  }
  room(roomId) {
    const r=this.rooms.get(String(roomId||''));
    if(!r)throw error('room-not-found',404);
    return r;
  }
  join(roomId,{inviteCode,displayName='Добытчик'}={}) {
    const room=this.room(roomId);
    this.advance(room);
    if(!active(room))throw error('room-finished',409);
    if(room.participants.length>=12)throw error('room-full',409);
    if(hash(inviteCode)!==room.inviteHash)throw error('invite-invalid',403);
    const name=String(displayName).trim().slice(0,40);
    if(!name || name.length>40)throw error('name-invalid');
    const token=this.makeId(24);
    const participant={
      id:this.makeId(8),name,tokenHash:hash(token),joinedAt:this.clock(),
      mode:'paused',lastAutoAt:this.clock(),manualStartedAt:0,
      steps:1000,spentSteps:0,extractedUnits:0,cargoUnits:0,
      manualHits:0,autoCycles:0,left:false,claimed:false,refundSteps:0
    };
    room.participants.push(participant);
    return {roomId:room.id,participantId:participant.id,sessionToken:token,limit:12};
  }
  member(room,token) {
    const submitted=Buffer.from(hash(token),'hex');
    const found=room.participants.find(p=>{
      const stored=Buffer.from(p.tokenHash,'hex');
      return stored.length===submitted.length && timingSafeEqual(stored,submitted);
    });
    if(!found)throw error('session-invalid',401);
    return found;
  }
  status(roomId,token) {
    const room=this.room(roomId);
    const viewer=this.member(room,token);
    this.advance(room);
    return {
      roomId:room.id,resourceId:room.resourceId,tier:room.tier,
      status:room.status,expiresAt:room.expiresAt,stockUnits:room.stockUnits,
      initialUnits:room.initialUnits,maxParticipants:12,
      participants:room.participants.map(p=>({
        id:p.id,name:p.name,extractedUnits:p.extractedUnits,
        autoCycles:p.autoCycles,manualHits:p.manualHits,left:p.left,
        mode:p.mode
      })),
      me:{
        id:viewer.id,steps:viewer.steps,spentSteps:viewer.spentSteps,
        extractedUnits:viewer.extractedUnits,cargoUnits:viewer.cargoUnits,
        refundSteps:viewer.refundSteps,claimed:viewer.claimed,left:viewer.left,
        mode:viewer.mode
      },
      rankings:clone(room.rankings)
    };
  }
  command(roomId,token,action) {
    const room=this.room(roomId);
    const me=this.member(room,token);
    this.advance(room);
    const now=this.clock();
    if(action==='claim') {
      if(me.claimed) return {ok:true,alreadyClaimed:true,cargoUnits:0,refundSteps:0};
      if(active(room) && !me.left) throw error('room-still-active',409);
      me.claimed=true;
      return {ok:true,alreadyClaimed:false,cargoUnits:me.cargoUnits,refundSteps:me.refundSteps,
        resourceId:room.resourceId,tier:room.tier};
    }
    if(action==='leave') {
      if(me.left)return {ok:true,left:true};
      if(!active(room))throw error('room-finished',409);
      me.left=true;
      me.mode='paused';
      me.manualStartedAt=0;
      return {ok:true,left:true,cargoUnits:me.cargoUnits};
    }
    if(!active(room)||me.left)throw error('room-not-active',409);
    if(action==='auto') {
      me.mode='auto';
      me.lastAutoAt=now;
      me.manualStartedAt=0;
      return {ok:true,mode:me.mode};
    }
    if(action==='pause') {
      me.mode='paused';
      me.manualStartedAt=0;
      return {ok:true,mode:me.mode};
    }
    if(action==='manual-start') {
      me.mode='manual';
      me.manualStartedAt=now;
      return {ok:true,startedAt:now};
    }
    if(action==='manual-stop') {
      if(me.mode!=='manual'||!me.manualStartedAt)throw error('not-in-manual',409);
      const elapsed=now-me.manualStartedAt;
      if(elapsed<400)throw error('too-early',409);
      if(me.steps<2)throw error('not-enough-steps',409);
      me.mode='paused';
      me.manualStartedAt=0;
      me.steps-=2;me.spentSteps+=2;
      const phase=(elapsed%2000)/2000*2;
      const position=phase<=1?phase:2-phase;
      const accuracy=.5-Math.abs(position-.5);
      const mined=elapsed>8000?0:accuracy>=.42?5:accuracy>=.22?3:1;
      const allocated=Math.min(room.stockUnits,mined);
      room.stockUnits-=allocated;
      me.extractedUnits+=allocated;me.cargoUnits+=allocated;
      if(allocated>0 && mined===5)me.manualHits++;
      if(room.stockUnits===0)this.finish(room,'depleted',now);
      return {ok:true,allocatedUnits:allocated,result:mined===5?'точно':mined===3?'хорошо':mined===1?'обычно':'промах'};
    }
    throw error('action-invalid',400);
  }
  advance(room, at=this.clock()) {
    if(!active(room))return;
    const cap=Math.min(at,room.expiresAt);
    // Advance all miners on a single server clock. Tied auto cycles are allocated round-robin
    // in join order instead of favoring whoever polls the API first.
    for(let guard=0;guard<5000 && room.stockUnits>0;guard++) {
      let selected=null,best=Infinity;
      for(const p of room.participants) {
        if(p.left||p.mode!=='auto')continue;
        const tick=p.lastAutoAt+cycleMs;
        if(tick<=cap && tick<best) {selected=p;best=tick;}
      }
      if(!selected)break;
      if(selected.steps<2) {
        selected.mode='paused';
        selected.lastAutoAt=cap;
        continue;
      }
      selected.steps-=2;selected.spentSteps+=2;selected.autoCycles++;
      selected.lastAutoAt=best;
      const mined=Math.min(2,room.stockUnits);
      room.stockUnits-=mined;selected.extractedUnits+=mined;selected.cargoUnits+=mined;
      if(room.stockUnits===0) {
        this.finish(room,'depleted',best);
        break;
      }
    }
    if(active(room) && at>=room.expiresAt) this.finish(room,'expired',room.expiresAt);
  }
  finish(room,reason,at=this.clock()) {
    if(!active(room))return;
    room.status=reason;room.finishedAt=at;
    const ranked=room.participants.filter(p=>p.extractedUnits>0)
      .sort((a,b)=>b.extractedUnits-a.extractedUnits || a.joinedAt-b.joinedAt || a.id.localeCompare(b.id));
    room.rankings=ranked.map((p,i)=>({participantId:p.id,rank:i+1,extractedUnits:p.extractedUnits}));
    if(reason==='depleted') {
      const solo=room.participants.length===1;
      ranked.forEach((p,i)=>{
        const percent=p.left?0:solo?25:rankRefundPercent(i+1);
        p.refundSteps=Math.min(p.spentSteps,Math.floor(p.spentSteps*percent/100));
        p.steps+=p.refundSteps;
      });
    }
    for(const p of room.participants){p.mode='paused';p.manualStartedAt=0;}
  }
  cleanup(now=this.clock()) {
    let removed=0;
    for(const [key,room] of this.rooms) {
      this.advance(room,now);
      if(now>room.expiresAt+86_400_000) {this.rooms.delete(key);removed++;}
    }
    return removed;
  }
}
