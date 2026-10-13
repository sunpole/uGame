import {alertMob,createMobState,damageMob,mobExperience,tickMob,validateMob,distance} from './mob-combat.js';
import {knightFacing} from './knight-atlas-core.js';

// One authored mob in the real Phaser world. Uses the existing mob-human PNG role.
// No city spawn, no balance-table edits, no master/event slot consumption.
export class MobSystem {
  constructor({scene,zoneSystem,eventSystem,knightRoles,getPlayerHp=()=>0,
    onPlayerDamage=()=>{},onXp=()=>{},onStatus=()=>{}}={}) {
    Object.assign(this,{scene,zoneSystem,eventSystem,knightRoles,getPlayerHp,
      onPlayerDamage,onXp,onStatus});
    this.definitions=[];this.entities=[];this.visualTicket=0;this.loaded=false;
    eventSystem?.on('zone:leave',()=>this.clear());
    eventSystem?.on('zone:enter',({zone})=>this.enterZone(zone));
    eventSystem?.on('zone:relayout',({zone,shiftX=0})=>{
      for(const e of this.entities){e.state.x+=shiftX;e.state.home.x+=shiftX;}
      this.syncVisuals();
    });
  }
  async load(url='./data/mobs.json'){
    const response=await fetch(url,{cache:'no-store'});
    if(!response.ok)throw Error('Mobs catalog HTTP '+response.status);
    const json=await response.json();
    if(!Array.isArray(json.mobs))throw Error('Mobs catalog: expected mobs array');
    const known=new Set();
    this.definitions=json.mobs.map(m=>{
      validateMob(m);
      if(known.has(m.id))throw Error('Duplicate mob '+m.id);
      known.add(m.id);return m;
    });
    this.loaded=true;
  }
  clear(){
    ++this.visualTicket;
    for(const e of this.entities){
      for(const object of [e.image,e.fallback,e.shadow,e.name,e.healthBar])
        object?.destroy?.();
    }
    this.entities=[];
  }
  enterZone(zone){
    this.clear();
    if(!zone||zone.isSafeCity||!this.loaded)return;
    for(const def of this.definitions.filter(m=>m.spawn.zoneId===zone.id)){
      const home=this.zoneSystem?.mapPoint?.(def.spawn)||def.spawn;
      const state=createMobState(def,home);
      const e={def,state,image:null,frame:'',elapsed:0,face:'S',ticket:this.visualTicket};
      e.shadow=this.scene.add.ellipse(home.x,home.y+14,36,10,0x000000,0.32).setDepth(8.9);
      e.fallback=this.scene.add.rectangle(home.x,home.y-13,23,39,0x3e7851).setDepth(9.4);
      e.name=this.scene.add.text(home.x,home.y-95,def.name+' · ЗРЛ '+def.level,{
        fontFamily:'Arial,sans-serif',fontSize:'15px',color:'#fff0cd',
        stroke:'#151b17',strokeThickness:3
      }).setOrigin(0.5).setDepth(16);
      e.healthBar=this.scene.add.graphics().setDepth(16);
      const entity=e;
      e.target={isEnemy:true,
        get x(){return entity.state.x;},get y(){return entity.state.y;},
        receiveDamage:(amount)=>this.hit(entity,amount)};
      this.entities.push(e);
      void this.loadVisual(e);
    }
    this.syncVisuals();
  }
  async loadVisual(e){
    if(!this.knightRoles?.ready||!e.state.alive)return;
    const ticket=e.ticket;
    let key=null;
    try{key=await this.knightRoles.texture('mob-human');}
    catch(error){console.warn('Mob visual fallback',error);}
    if(!key||ticket!==this.visualTicket||!this.entities.includes(e)||!e.state.alive)return;
    const setting=this.knightRoles.setting('mob-human');
    e.image?.destroy();
    e.image=this.scene.add.image(e.state.x,e.state.y+19,key,'S-idle')
      .setOrigin(0.5,0.94).setScale(setting.scale).setDepth(9.5);
    e.frame='S-idle';e.fallback?.setVisible(false);
    e.shadow.setAlpha(setting.shadow).setSize(38*setting.scale,11*setting.scale);
  }
  refreshVisual(){
    for(const e of this.entities){
      if(!e.state.alive)continue;
      const key=this.knightRoles?.textures?.get('mob-human');
      if(!e.image||e.image.texture.key!==key)void this.loadVisual(e);
      else {
        const setting=this.knightRoles.setting('mob-human');
        e.image.setScale(setting.scale);
        e.shadow.setAlpha(setting.shadow).setSize(38*setting.scale,11*setting.scale);
      }
    }
  }
  targets(){return this.entities.filter(e=>e.state.alive).map(e=>e.target);}
  alertSocial(source){
    if(!source.def.social||source.def.socialRadius<=0)return;
    for(const other of this.entities){
      if(other===source||!other.state.alive||!other.def.social)continue;
      if(source.def.socialGroup&&source.def.socialGroup!==other.def.socialGroup)continue;
      if(distance(source.state,other.state)<=source.def.socialRadius)alertMob(other.state);
    }
  }
  hit(e,amount){
    if(!e.state.alive)return;
    const result=damageMob(e.state,e.def,amount);
    if(!result.hit)return;
    if(result.newlyAlerted)this.alertSocial(e);
    if(result.killed){
      e.image?.destroy();e.image=null;e.fallback?.destroy();e.fallback=null;
      e.shadow?.destroy();e.shadow=null;e.name?.destroy();e.name=null;
      e.healthBar?.destroy();e.healthBar=null;
      const xp=mobExperience(e.def);
      if(!e.state.rewarded){
        e.state.rewarded=true;
        this.onXp(xp,e.def);
        this.onStatus(e.def.name+' побеждён · +'+xp+' ЗРП');
      }
    } else this.onStatus(e.def.name+' · '+Math.ceil(e.state.hp)+'/'+e.def.hp+' ХП');
  }
  tick(deltaMs){
    if(!this.loaded||!this.zoneSystem?.current||!this.entities.length)return;
    const player=this.zoneSystem.player;
    const dt=Math.min(Math.max(0,Number(deltaMs)||0),100)/1000;
    for(const e of this.entities){
      if(!e.state.alive)continue;
      const old={x:e.state.x,y:e.state.y};
      const hp=Number(this.getPlayerHp())||0;
      const wasAlerted=e.state.alerted;
      tickMob(e.state,e.def,{x:player.x,y:player.y,hp},dt,{
        canMove:(x,y)=>this.zoneSystem.isInsidePlayable(x,y,25) &&
          !this.zoneSystem.collidesWithWall(x,y,20),
        attack:({damage,crit})=>{
          this.onPlayerDamage(damage,e.def);
          if(crit)this.onStatus(e.def.name+' · критическая атака ×'+e.def.critMultiplier);
        }
      });
      if(!wasAlerted&&e.state.alerted)this.alertSocial(e);
      const dx=e.state.x-old.x,dy=e.state.y-old.y;
      if(Math.hypot(dx,dy)>0.05){
        e.face=knightFacing({x:dx,y:dy});
        e.elapsed+=deltaMs;
      }else e.elapsed=0;
    }
    this.syncVisuals();
  }
  syncVisuals(){
    for(const e of this.entities){
      if(!e.state.alive)continue;
      const {x,y,hp}=e.state,scale=this.knightRoles?.setting('mob-human')?.scale||.95;
      e.shadow?.setPosition(x,y+16);
      e.fallback?.setPosition(x,y-13);
      e.name?.setPosition(x,y-95*scale);
      if(e.image){
        e.image.setPosition(x,y+19);
        const frame=e.face+'-'+(e.elapsed?Math.floor(e.elapsed/105)%11:'idle');
        if(frame!==e.frame){e.frame=frame;e.image.setFrame(frame);}
      }else if(this.knightRoles?.ready)void this.loadVisual(e);
      if(e.healthBar){
        e.healthBar.clear();
        e.healthBar.fillStyle(0x15191a,.9).fillRoundedRect(x-31,y-75*scale,62,8,2);
        e.healthBar.fillStyle(e.state.alerted?0xd45145:0x59b96a,1)
          .fillRoundedRect(x-30,y-74*scale,60*hp/e.def.hp,6,2);
      }
    }
  }
  executeDevCode(code){
    if(code==='8590'){
      if(!this.loaded||!this.zoneSystem?.current)
        return {handled:true,state:'warn',message:'Каталог мобов ещё не загружен'};
      const m=this.definitions.find(x=>x.id==='forest-thief');
      if(!m)return {handled:true,state:'warn',message:'Лесной вор не найден'};
      this.zoneSystem.travel({zoneId:m.spawn.zoneId,entryId:'center'});
      // DEV-only positioning: a reliable safe range to test passive -> Impulse,
      // without depending on browser keyboard focus or Phaser private globals.
      const mob=this.entities.find(e=>e.def.id===m.id);
      if(mob){
        const x=mob.state.x-45,y=mob.state.y;
        if(this.zoneSystem.isInsidePlayable(x,y,25) &&
           !this.zoneSystem.collidesWithWall(x,y,20)){
          this.zoneSystem.player.setPosition(x,y);
        }
      }
      return {handled:true,state:'ok',message:'8590 · Лесной вор · '+m.spawn.zoneId+' · рядом с мобом'};
    }
    if(code==='8599'){
      const mob=this.entities.find(e=>e.def.id==='forest-thief');
      return {handled:true,state:'ok',message:mob
        ?'Лесной вор · '+Math.ceil(mob.state.hp)+'/'+mob.def.hp+' ХП · '+mob.state.mode+
          ' · '+(mob.state.alive?'жив':'побеждён')+
          ' · дистанция '+Math.round(distance(mob.state,this.zoneSystem.player))+' px'
        :'Лесной вор вне текущей локации'};
    }
    return {handled:false};
  }
}
