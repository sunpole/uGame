import {KNIGHT_FRAME_SIZE,KNIGHT_DISPLAY_FRAME,KNIGHT_WALK_FRAMES,KNIGHT_ROLES,KNIGHT_DIRS,KNIGHT_ATLAS_ROWS,isKnightRole,knightRoleInfo,safeKnightSetting,validateKnightUpload,knightSourcePalette,decodeKnightRun} from './knight-atlas-core.js';
const DATA='./data/knight-source/';
const PREF_KEY='ugame.knight-visuals.v1',DB_NAME='ugame-knight-uploads-v1';
const FILE_LIMIT=12*1024*1024;
function storageRead(){try{return JSON.parse(localStorage.getItem(PREF_KEY)||'{}')}catch{return {};}}
function storageWrite(value){try{localStorage.setItem(PREF_KEY,JSON.stringify(value));return true}catch{return false;}}
function openDb(){
 return new Promise((resolve,reject)=>{
  if(!globalThis.indexedDB)return reject(Error('IndexedDB недоступен'));
  const req=indexedDB.open(DB_NAME,1);
  req.onupgradeneeded=()=>req.result.createObjectStore('png');
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||Error('IndexedDB'));
 });
}
async function dbValue(db,mode,role,value){
 return new Promise((resolve,reject)=>{
  const tx=db.transaction('png',mode),store=tx.objectStore('png');
  const req=mode==='readonly'?store.get(role):value==null?store.delete(role):store.put(value,role);
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
 });
}
function makeCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
async function fileCanvas(blob){
 const bmp=await createImageBitmap(blob);
 try{
  validateKnightUpload(bmp.width,bmp.height);
  const c=makeCanvas(bmp.width,bmp.height);c.getContext('2d',{willReadFrequently:true}).drawImage(bmp,0,0);
  // PNG must have transparent space; guard against pasted screenshot and black backgrounds.
  const probe=c.getContext('2d').getImageData(0,0,20,20).data;
  let opaque=0;for(let i=3;i<probe.length;i+=4)if(probe[i]>5)opaque++;
  if(opaque>350)throw Error('Похоже, фон непрозрачный. Нужен PNG с прозрачными полями между кадрами.');
  return c;
 }finally{bmp.close();}
}
export class KnightRoleLibrary{
 constructor({onChange}={}){
  this.onChange=onChange;
  this.settings=Object.fromEntries(KNIGHT_ROLES.map(r=>[r.id,safeKnightSetting(r.id,storageRead()[r.id])]));
  this.uploads=new Map();this.textures=new Map();this.db=null;this.source=null;
  this.ready=false;this.error='';this.scene=null;this.revision=0;
  this.pending=new Map();this.selectedRole=storageRead().__selected||null;
 }
 setting(role){return this.settings[role]||null;}
 hasUpload(role){return this.uploads.has(role);}
 uploadName(role){return this.uploads.get(role)?.name||'';}
 roleNames(){return KNIGHT_ROLES;}
 async initialize(){
  try{
   const [manifest,palette,walk,idle]=await Promise.all(['manifest','palette','Walk','Idle'].map(async name=>{
    const response=await fetch(DATA+name+'.json',{cache:'force-cache'});
    if(!response.ok)throw Error(name+' HTTP '+response.status);
    return response.json();
   }));
   if(manifest.frameSize!==256||manifest.animations.Walk.frameCount!==11||
      walk.dirs.length!==8||idle.dirs.length!==8)throw Error('Неверный формат рыцаря');
   this.source={manifest,palette,walk,idle};
   try{
    this.db=await openDb();
    for(const role of KNIGHT_ROLES){
     const found=await dbValue(this.db,'readonly',role.id).catch(()=>null);
     if(found?.blob instanceof Blob&&found.blob.size<=FILE_LIMIT){
      this.uploads.set(role.id,{name:found.name,blob:found.blob});
     }
    }
   }catch(error){this.error='Импорт PNG не будет сохраняться в этом браузере: '+error.message;}
   this.ready=true;this.onChange?.();
  }catch(error){this.error='Исходные кадры недоступны: '+String(error.message||error);this.onChange?.();}
 }
 bindScene(scene){this.scene=scene;this.textures.clear();this.pending.clear();if(this.ready)this.onChange?.();}
 selectHeroRole(role){
  if(role!==null&&(!isKnightRole(role)||knightRoleInfo(role).group!=='hero'))throw Error('Для героя выбери одну из четырёх моделей');
  this.selectedRole=role;
  return storageWrite({...this.settings,__selected:role});
 }
 async importPng(role,file){
  if(!isKnightRole(role))throw Error('Неизвестная роль');
  if(file?.type!=='image/png')throw Error('Выбери PNG, не JPG и не GIF');
  if(file.size>FILE_LIMIT)throw Error('PNG больше 12 МБ. Экспортируй с оптимизацией PNG.');
  await fileCanvas(file);
  if(!this.db)throw Error('В этом браузере нельзя сохранить загрузку. Открой Chrome без приватного режима.');
  const next={name:String(file.name||'custom.png').slice(0,110),blob:file};
  await dbValue(this.db,'readwrite',role,{...next});
  this.uploads.set(role,next);
  this.invalidate(role);
  return next.name;
 }
 async clearPng(role){
  if(!isKnightRole(role))return;
  if(this.db)await dbValue(this.db,'readwrite',role,null);
  this.uploads.delete(role);this.invalidate(role);
 }
 setSettings(role,entry){
  this.settings[role]=safeKnightSetting(role,{...this.settings[role],...entry});
  const ok=storageWrite({...this.settings,__selected:this.selectedRole});
  this.onChange?.();
  return ok;
 }
 invalidate(role){this.textures.delete(role);this.pending.delete(role);this.revision++;this.onChange?.();}
 async texture(role){
  if(!this.ready||!this.scene||!isKnightRole(role))return null;
  const cached=this.textures.get(role);if(cached)return cached;
  if(this.pending.has(role))return this.pending.get(role);
  const revision=this.revision,scene=this.scene;
  const pending=(async()=>{
   const canvas=await this.compile(role);
   if(!scene?.textures||this.scene!==scene||revision!==this.revision)return null;
   const key='ugame-knight-'+role+'-'+revision;
   const texture=scene.textures.exists(key)?scene.textures.get(key):scene.textures.addCanvas(key,canvas);
   for(let dir=0;dir<8;dir++){
    const prefix=KNIGHT_DIRS[dir]+'-';
    for(let i=0;i<11;i++)if(!texture.has(prefix+i))texture.add(prefix+i,0,i*128,dir*128,128,128);
    if(!texture.has(prefix+'idle'))texture.add(prefix+'idle',0,11*128,dir*128,128,128);
   }
   texture.ugameOpaqueTop=canvas.ugameOpaqueTop;
   this.textures.set(role,key);return key;
  })();
  this.pending.set(role,pending);
  try{return await pending;}finally{if(this.pending.get(role)===pending)this.pending.delete(role);}
 }
 async compile(role){
  const upload=this.uploads.get(role);
  const provided=upload?await fileCanvas(upload.blob):null;
  const s=this.source;if(!provided&&!s)throw Error('Нет базовых кадров');
  const scratch=makeCanvas(256,256),ctx=scratch.getContext('2d',{willReadFrequently:true});
  const raw=[];
  const palette=provided?null:knightSourcePalette(s.palette,knightRoleInfo(role).tone);
  const ordered=provided?KNIGHT_ATLAS_ROWS:[0,1,2,3,4,5,6,7];
  const union={minX:255,minY:255,maxX:0,maxY:0,any:false};
  for(let dir=0;dir<8;dir++){
   const each=[];
   for(let index=0;index<12;index++){
    if(provided){
     const row=KNIGHT_ATLAS_ROWS.indexOf(dir);
     ctx.clearRect(0,0,256,256);
     ctx.drawImage(provided,index===11?0:index*256,row*256,256,256,0,0,256,256);
    }else{
     const encoded=index===11?s.idle.dirs[dir].frames[0]:s.walk.dirs[dir].frames[index];
     ctx.putImageData(decodeKnightRun(encoded,palette,ctx),0,0);
    }
    const img=ctx.getImageData(0,0,256,256);each.push(img);
    const a=img.data;
    for(let y=0;y<256;y++)for(let x=0;x<256;x++){
     if(a[(y*256+x)*4+3]<8)continue;
     union.any=true;union.minX=Math.min(union.minX,x);union.maxX=Math.max(union.maxX,x);
     union.minY=Math.min(union.minY,y);union.maxY=Math.max(union.maxY,y);
    }
   }
   raw.push(each);
  }
  if(!union.any)throw Error('В атласе нет непрозрачных пикселей');
  if(union.maxX-union.minX>=124||union.maxY-union.minY>=124)
   throw Error('Спрайты слишком крупные для исходной сетки. Проверь PNG 2816×2048 и прозрачность.');
  const cropX=Math.max(0,Math.min(128,Math.round((union.minX+union.maxX)/2-64)));
  const cropY=Math.max(0,Math.min(128,union.maxY-121));
  const atlas=makeCanvas(128*12,128*8),out=atlas.getContext('2d');
  for(let dir=0;dir<8;dir++)for(let frame=0;frame<12;frame++){
   ctx.putImageData(raw[dir][frame],0,0);
   out.drawImage(scratch,cropX,cropY,128,128,frame*128,dir*128,128,128);
  }
  // Shared across directions/frames; keeps labels above the actual model,
  // rather than above the transparent padding in each 128px atlas cell.
  atlas.ugameOpaqueTop=Math.max(0,union.minY-cropY);
  return atlas;
 }
 async preview(role){
  const canvas=await this.compile(role),img=makeCanvas(128,128);
  img.getContext('2d').drawImage(canvas,11*128,7*128,128,128,0,0,128,128);
  return img.toDataURL('image/png');
 }
}
