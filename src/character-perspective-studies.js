// v0.2.76: two original neutral silhouettes, not external asset packs.
// Same neutral palette and frame size, only the projected body geometry changes.
export const PERSPECTIVE_SIZES=Object.freeze({small:0.78,medium:1.05,large:1.35});
export const PERSPECTIVES=Object.freeze(['three-quarter','high-topdown']);
export function perspectiveDescriptor(id){
  const match=/^(three-quarter|high-topdown)-(small|medium|large)$/.exec(id||'');
  if(!match)return null;
  return Object.freeze({angle:match[1],size:match[2],scale:PERSPECTIVE_SIZES[match[2]]});
}
export function visualScale(id){return perspectiveDescriptor(id)?.scale??1.05;}
export function perspectiveSheetKey(id){
  const p=perspectiveDescriptor(id);
  return p?'ugame-angle-'+p.angle:null;
}
export function drawPerspectiveWalkingSheet(ctx,angle){
  if(!PERSPECTIVES.includes(angle))throw Error('Unknown camera perspective: '+angle);
  const high=angle==='high-topdown';
  const F={width:32,height:48,count:4};
  ctx.clearRect(0,0,F.width*F.count,F.height*4);
  ctx.imageSmoothingEnabled=false;
  const ink='#303d49',cloth='#71818a',light='#aebcc0',skin='#d6ae8e',hair='#3b393c';
  const block=(fill,x,y,w,h)=>{ctx.fillStyle=fill;ctx.fillRect(Math.round(x),Math.round(y),w,h);};
  ['down','left','right','up'].forEach((facing,row)=>{
    const side=facing==='left'||facing==='right',back=facing==='up';
    for(let frame=0;frame<4;frame++){
      ctx.save();ctx.translate(frame*32,row*48);
      const swing=[0,2,0,-2][frame],opposite=-swing;
      const bob=frame%2;
      // Every frame has exactly the same canvas footprint / ground anchor.
      block('rgba(0,0,0,.25)',7,43,19,3);
      if(!high){
        // Three-quarter RPG view: long legs, full front torso, smaller face.
        block(ink,10+swing,33,5,10);block(ink,18+opposite,33,5,10);
        block(cloth,9,20+bob,14,14);
        block(light,10,21+bob,12,2);
        block(ink,7,23+opposite,3,9);
        block(ink,23,23+swing,3,9);
        block(skin,7,30+opposite,3,3);block(skin,23,30+swing,3,3);
        const x=side?(facing==='left'?9:13):11;
        block(hair,x,8+bob,11,10);
        block(skin,x+1,11+bob,9,8);
        block(hair,x,8+bob,11,3);
        if(back)block(hair,x+1,13+bob,9,6);
        else if(side)block(ink,facing==='left'?x+1:x+9,15+bob,1,2);
        else {block(ink,x+3,15+bob,1,2);block(ink,x+8,15+bob,1,2);}
      }else{
        // Higher overhead camera: head ellipse dominates, torso/legs foreshortened.
        // Importantly not merely shrinking or vertically shifting a 3/4 frame.
        block(ink,9+swing,38,6,5);block(ink,18+opposite,38,6,5);
        block(cloth,9,26+bob,15,12);
        block(light,10,29+bob,13,3);
        block(ink,5,27+opposite,4,9);block(ink,24,27+swing,4,9);
        block(skin,5,34+opposite,4,2);block(skin,24,34+swing,4,2);
        // Visible crown: wide and deeper head, seen mostly from above.
        block(hair,8,8+bob,17,15);
        block(hair,10,6+bob,13,17);
        block(skin,9,16+bob,15,9);
        block(hair,8,12+bob,17,6);
        if(back)block(hair,9,18+bob,15,7);
        else if(side){
          block(ink,facing==='left'?10:22,21+bob,2,1);
        }else{
          block(ink,13,22+bob,2,1);block(ink,20,22+bob,2,1);
        }
      }
      ctx.restore();
    }
  });
}
