// v0.2.77: 12 visual-only slots. Zone assignment is cosmetic, never game balance.
export const KNIGHT_FRAME_SIZE=256;
export const KNIGHT_DISPLAY_FRAME=128;
export const KNIGHT_WALK_FRAMES=11;
export const KNIGHT_UPLOAD_WIDTH=KNIGHT_FRAME_SIZE*KNIGHT_WALK_FRAMES;
export const KNIGHT_UPLOAD_HEIGHT=KNIGHT_FRAME_SIZE*8;
export const KNIGHT_DIRS=Object.freeze(['SW','W','NW','N','NE','E','SE','S']);
export const KNIGHT_ATLAS_ROWS=Object.freeze([2,3,4,1,5,0,7,6]); // Photoshop PNG row order
export const KNIGHT_ROLES=Object.freeze([
 {id:'hero-plate',name:'Герой 1 · латный',group:'hero',tone:'#bdc3b9',scale:0.84},
 {id:'hero-leather',name:'Герой 2 · кожаный',group:'hero',tone:'#917451',scale:0.84},
 {id:'hero-cloth',name:'Герой 3 · тканевый',group:'hero',tone:'#ac9ab1',scale:0.84},
 {id:'hero-hybrid',name:'Герой 4 · смешанный',group:'hero',tone:'#8ba5ad',scale:0.84},
 {id:'banker',name:'Банкир · общий',group:'npc',tone:'#b69c53',scale:1.9},
 {id:'teleporter-a',name:'Телепортер · вариант 1',group:'npc',tone:'#7a6fb9',scale:2.05},
 {id:'teleporter-b',name:'Телепортер · вариант 2',group:'npc',tone:'#ac8cc9',scale:2.05},
 {id:'ruler-1',name:'Страж/правитель · столица 1',group:'npc',tone:'#d3d5e3',scale:2.25},
 {id:'ruler-2',name:'Страж/правитель · столица 2',group:'npc',tone:'#477957',scale:2.25},
 {id:'ruler-3',name:'Страж/правитель · столица 3',group:'npc',tone:'#c39b5f',scale:2.25},
 {id:'ruler-4',name:'Страж/правитель · столица 4',group:'npc',tone:'#b98a81',scale:2.25},
 {id:'mob-human',name:'Человек-противник · образец',group:'mob',tone:'#985a61',scale:0.95}
].map(Object.freeze));
const ROLE_IDS=new Set(KNIGHT_ROLES.map(r=>r.id));
export function isKnightRole(id){return ROLE_IDS.has(id);}
export function knightRoleInfo(id){return KNIGHT_ROLES.find(r=>r.id===id)||null;}
export function knightHeroRole(identity){
 return {plate:'hero-plate',leather:'hero-leather',cloth:'hero-cloth',hybrid:'hero-hybrid'}[identity?.archetype]||'hero-plate';
}
const RULERS=Object.freeze({'loc-00001':'ruler-1','loc-00005':'ruler-2','loc-00021':'ruler-3','loc-00025':'ruler-4'});
export function knightNpcRole(item){
 if(item?.type==='city-banker')return 'banker';
 if(item?.type==='city-teleporter')
  return ['loc-00005','loc-00025'].some(z=>item.id?.startsWith(z))?'teleporter-b':'teleporter-a';
 if(item?.type==='city-guide')return RULERS[String(item.id||'').slice(0,9)]||null;
 return null; // No combat mobs are spawned by selecting a visual role.
}
export function knightFacing(direction){
 const x=Number(direction?.x)||0,y=Number(direction?.y)||0;
 if(Math.abs(x)<0.01&&Math.abs(y)<0.01)return 'S';
 const deg=Math.atan2(-y,x);
 const sectors=['E','NE','N','NW','W','SW','S','SE'];
 return sectors[(Math.round(deg/(Math.PI/4))+8)%8];
}
export function validateKnightUpload(width,height){
 if(width!==KNIGHT_UPLOAD_WIDTH||height!==KNIGHT_UPLOAD_HEIGHT)
  throw Error('Нужен исходный PNG 2816×2048: 11 кадров в строке × 8 строк. Скриншот или AI-картинка другого размера не подойдут.');
 return true;
}
export function safeKnightSetting(role,entry={}){
 if(!isKnightRole(role))throw Error('Неизвестная графическая роль');
 const defaults=knightRoleInfo(role),scale=Number(entry?.scale),shadow=Number(entry?.shadow);
 return {scale:Number.isFinite(scale)?Math.min(3.5,Math.max(0.3,scale)):defaults.scale,
   shadow:Number.isFinite(shadow)?Math.min(0.8,Math.max(0,shadow)):0.32,
   enabled:entry?.enabled!==false};
}
export function knightPaletteTone(rgba,tone,cloth){
 if(!cloth)return rgba;
 const hex=tone.replace('#','');
 const color=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16));
 const luma=(rgba[0]*.299+rgba[1]*.587+rgba[2]*.114)/175;
 return color.map(v=>Math.min(255,Math.round(v*Math.max(.3,Math.min(1.38,luma))))).concat(rgba[3]);
}
export function decodeKnightRun(encoded,palette,ctx){
 const image=ctx.createImageData(256,256),target=image.data,binary=atob(encoded);
 for(let i=0;i<binary.length;){
  const y=binary.charCodeAt(i++),x=binary.charCodeAt(i++),n=binary.charCodeAt(i++);
  if(y>=256||x+n>256||i+n>binary.length)throw Error('Сломанный исходный кадр');
  let offset=(y*256+x)*4;
  for(let c=0;c<n;c++){
   const p=palette[binary.charCodeAt(i++)];if(!p)throw Error('Палитра кадра повреждена');
   target[offset++]=p[0];target[offset++]=p[1];target[offset++]=p[2];target[offset++]=p[3];
  }
 }
 return image;
}
export function knightSourcePalette(definition,tone){
 const colors=definition.palette.map(c=>[0,2,4,6].map(i=>parseInt(c.slice(i+1,i+3),16)));
 return colors.map((color,index)=>knightPaletteTone(color,tone,definition.bands?.runtime?.[index]==='cloth'));
}
