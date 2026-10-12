// v0.2.75: original, locally drawn 4-way walking costume studies.
// All pixels are created by uGame code; this is NOT a third-party asset import.
export const FRAME_WIDTH=32;
export const FRAME_HEIGHT=48;
export const WALK_FRAMES=4;
export const DIRECTIONS=Object.freeze(['down','left','right','up']);
export const ORIGINAL_VISUAL_ID='original';
export const CHARACTER_VISUALS=Object.freeze([
  Object.freeze({id:'original',label:'Оригинальный uGame',note:'Наш самый первый Phaser-человечек. Без изменений.',type:'original'}),
  Object.freeze({id:'blue-striped',label:'Синий в полоску',note:'Яркая учебная форма, читаемая издалека.',type:'pixel'}),
  Object.freeze({id:'stone-guard',label:'Каменный страж',note:'Широкие плечи и плотная светлая одежда.',type:'pixel'}),
  Object.freeze({id:'forest-traveler',label:'Лесной путник',note:'Зелёный капюшон и короткий плащ.',type:'pixel'}),
  Object.freeze({id:'quiet-scholar',label:'Строгий книжник',note:'Высокая фигура, спокойные светлые ткани.',type:'pixel'}),
  Object.freeze({id:'road-wanderer',label:'Дорожный странник',note:'Тёмный жилет, дорожный шарф и лёгкая одежда.',type:'pixel'})
]);
const PALETTES=Object.freeze({
  'blue-striped':{body:'#286b9f',edge:'#20466d',trim:'#c4e8ff',pants:'#234061',hair:'#49322e',skin:'#e0b394',cloak:null,hat:null,robe:false,wide:false,striped:true},
  'stone-guard':{body:'#7f909d',edge:'#333f51',trim:'#d8e4df',pants:'#3c536b',hair:'#3a312e',skin:'#c99a73',cloak:'#536675',hat:null,robe:false,wide:true,striped:false},
  'forest-traveler':{body:'#396c50',edge:'#234839',trim:'#afd2a0',pants:'#3c4d3c',hair:'#493c2f',skin:'#dbac84',cloak:'#244b3b',hat:'#56774d',robe:false,wide:false,striped:false},
  'quiet-scholar':{body:'#b9aa8f',edge:'#6c4856',trim:'#f2e6d2',pants:'#6b4c61',hair:'#403036',skin:'#dcb498',cloak:'#725468',hat:null,robe:true,wide:false,striped:false},
  'road-wanderer':{body:'#a47d51',edge:'#483d39',trim:'#ca8b75',pants:'#4e4d56',hair:'#2b3033',skin:'#bd9273',cloak:null,hat:'#4d5155',robe:false,wide:false,striped:false}
});
export function isCharacterVisualId(id){return CHARACTER_VISUALS.some(v=>v.id===id);}
export function visualLabel(id){return CHARACTER_VISUALS.find(v=>v.id===id)?.label||'Оригинальный uGame';}
export function directionFromVector(direction){
  const x=Number(direction?.x)||0,y=Number(direction?.y)||0;
  return Math.abs(x)>Math.abs(y)?(x<0?'left':'right'):(y<0?'up':'down');
}
export function sheetTextureKey(id){return 'ugame-walk-'+id;}

// Simple original pixel-art trials: 4 directions × 4 genuinely different walk poses.
// No changes to gameplay movement, hero identity, save data, or stat calculations.
export function drawWalkingSheet(ctx,id){
  const p=PALETTES[id];
  if(!p)throw Error('Unknown walking sprite: '+id);
  const dot=(color,x,y,w,h)=>{ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h);};
  ctx.clearRect(0,0,FRAME_WIDTH*WALK_FRAMES,FRAME_HEIGHT*DIRECTIONS.length);
  ctx.imageSmoothingEnabled=false;
  DIRECTIONS.forEach((face,row)=>{
    for(let step=0;step<WALK_FRAMES;step++){
      ctx.save();ctx.translate(step*FRAME_WIDTH,row*FRAME_HEIGHT);
      const cycle=[0,2,0,-2][step];
      const alternate=[0,-2,0,2][step];
      const front=face==='down',back=face==='up',side=!front&&!back;
      const wide=p.wide?2:0,bodyX=9-wide,bodyW=14+2*wide;
      // Contact shadow and real alternating feet.
      dot('rgba(0,0,0,.24)',7,43,19,3);
      if(p.robe){
        dot(p.edge,10,29,12,13);
        dot(p.body,9,28,14,13);
        dot(p.trim,15,30,2,11);
        dot(p.pants,10+cycle,41,5,3);dot(p.pants,18+alternate,41,5,3);
      }else{
        dot(p.pants,10+cycle,33,5,9);
        dot(p.pants,18+alternate,33,5,9);
        dot(p.edge,10+cycle,40,5,3);
        dot(p.edge,18+alternate,40,5,3);
      }
      if(p.cloak){
        dot(p.edge,bodyX-2,18,bodyW+4,18);
        dot(p.cloak,bodyX-1,18,bodyW+2,17);
      }
      const bob=(step===1||step===3)?1:0;
      dot(p.edge,bodyX,18+bob,bodyW,17);
      dot(p.body,bodyX+2,19+bob,bodyW-4,14);
      if(p.striped){
        for(let y=22;y<=29;y+=4)dot(p.trim,bodyX+2,y+bob,bodyW-4,2);
      }else{
        dot(p.trim,bodyX+4,19+bob,bodyW-8,2);
        dot(p.trim,15,22+bob,2,10);
      }
      // Separate alternating arm positions, but do not create weapon props.
      if(side){
        dot(p.edge,face==='left'?7:22,20+alternate,4,12);
        dot(p.skin,face==='left'?7:22,29+alternate,4,3);
      }else{
        dot(p.edge,bodyX-4,20+cycle,4,12);
        dot(p.edge,bodyX+bodyW,20+alternate,4,12);
        dot(p.skin,bodyX-4,29+cycle,4,3);
        dot(p.skin,bodyX+bodyW,29+alternate,4,3);
      }
      // Direction-specific face / hair / hood, not a flat rotated south pose.
      const headX=side?(face==='left'?9:13):11;
      dot(p.hair,headX,5+bob,12,13);
      dot(p.skin,headX+2,8+bob,8,9);
      if(back)dot(p.hair,headX,7+bob,12,10);
      else if(side)dot('#44372f',face==='left'?headX+1:headX+9,12+bob,2,2);
      else {dot('#49372f',headX+3,12+bob,2,2);dot('#49372f',headX+8,12+bob,2,2);}
      if(p.hat){
        dot(p.hat,headX-2,5+bob,16,5);
        dot(p.edge,headX,3+bob,12,4);
      }
      ctx.restore();
    }
  });
}
export function makeGalleryPreview(id,root=document){
  if(id===ORIGINAL_VISUAL_ID)return null;
  const canvas=root.createElement('canvas');
  canvas.width=FRAME_WIDTH*WALK_FRAMES;
  canvas.height=FRAME_HEIGHT*DIRECTIONS.length;
  drawWalkingSheet(canvas.getContext('2d'),id);
  return canvas.toDataURL('image/png');
}
export function installWalkingTextures(scene){
  for(const visual of CHARACTER_VISUALS){
    if(visual.type!=='pixel')continue;
    const key=sheetTextureKey(visual.id);
    if(scene.textures.exists(key))continue;
    const texture=scene.textures.createCanvas(key,FRAME_WIDTH*WALK_FRAMES,FRAME_HEIGHT*DIRECTIONS.length);
    drawWalkingSheet(texture.getContext(),visual.id);
    texture.refresh();
    DIRECTIONS.forEach((dir,row)=>{
      for(let i=0;i<WALK_FRAMES;i++){
        texture.add(dir+'-'+i,0,i*FRAME_WIDTH,row*FRAME_HEIGHT,FRAME_WIDTH,FRAME_HEIGHT);
      }
    });
  }
}
