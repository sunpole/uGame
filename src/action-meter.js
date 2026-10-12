export function actionProgress(elapsedMs,durationMs){
  if(!Number.isFinite(durationMs)||durationMs<=0)return 100;
  return Math.min(100,Math.max(0,(Number(elapsedMs)||0)/durationMs*100));
}
export class ActionMeter {
  constructor({root=document,clock=()=>performance.now(),
    requestFrame=callback=>requestAnimationFrame(callback),
    cancelFrame=id=>cancelAnimationFrame(id)}={}){
    Object.assign(this,{root,clock,requestFrame,cancelFrame});
    this.frame=null;this.active=null;this.seq=0;
  }
  paint(pct,name,state){
    const bar=this.root.querySelector('#action-meter');
    if(!bar)return;
    bar.dataset.state=state;
    bar.setAttribute('aria-valuenow',String(Math.round(pct)));
    const fill=this.root.querySelector('#action-meter-fill');
    if(fill)fill.style.width=pct.toFixed(2)+'%';
    const label=this.root.querySelector('#action-meter-name');
    if(label)label.textContent=name;
    const value=this.root.querySelector('#action-meter-pct');
    if(value)value.textContent=Math.round(pct)+'%';
  }
  start({label='Действие',durationMs=0}={},now=this.clock()){
    if(this.frame!==null){this.cancelFrame(this.frame);this.frame=null;}
    this.seq++;
    const seq=this.seq;
    const duration=Math.max(0,Number(durationMs)||0);
    this.active={start:now,duration,label};
    this.paint(0,label,'casting');
    const step=()=>{
      if(seq!==this.seq)return;
      const pct=actionProgress(this.clock()-now,duration);
      this.paint(pct,label,pct>=100?'completed':'casting');
      if(pct<100){this.frame=this.requestFrame(step);}
      else {this.active=null;this.frame=null;}
    };
    this.frame=this.requestFrame(step);
  }
  destroy(){
    this.seq++;
    if(this.frame!==null)this.cancelFrame(this.frame);
    this.frame=null;this.active=null;
  }
}
