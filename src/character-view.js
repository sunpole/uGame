import {ORIGINAL_VISUAL_ID,isCharacterVisualId,installWalkingTextures,sheetTextureKey,directionFromVector,visualScale,perspectiveDescriptor} from './character-sprite-gallery.js';
import {knightFacing} from './knight-atlas-core.js';
function approach(current, target, delta, response = 80) {
  const t = 1 - Math.exp(-Math.max(0, delta) / response);
  return current + (target - current) * t;
}

function createHumanoidVisual(scene, {
  x = 0,
  y = 0,
  depth = 5,
  bodyColor = 0x5f81ff,
  legColor = 0x30363d,
  skinColor = 0xe7c6a5,
  faceColor = 0x1f2328,
  bodyWidth = 20,
  bodyHeight = 24,
  armOffset = 10,
  armWidth = 5,
  armHeight = 14,
  legOffset = 5,
  legWidth = 6,
  legHeight = 12,
  shadowWidth = 24,
  shadowHeight = 10,
  scaleX = 1,
  scaleY = 1
} = {}) {
  const container = scene.add.container(x, y).setDepth(depth);
  const shadow = scene.add.ellipse(0, 9, shadowWidth, shadowHeight, 0x000000, 0.35);
  const body = scene.add.ellipse(0, 4, bodyWidth, bodyHeight, bodyColor, 1);
  const head = scene.add.circle(0, 1, 8, skinColor, 1);
  const face = scene.add.circle(0, -2, 2.3, faceColor, 1);
  const armLeft = scene.add.rectangle(-armOffset, 4, armWidth, armHeight, skinColor, 1);
  const armRight = scene.add.rectangle(armOffset, 4, armWidth, armHeight, skinColor, 1);
  const legLeft = scene.add.rectangle(-legOffset, 13, legWidth, legHeight, legColor, 1);
  const legRight = scene.add.rectangle(legOffset, 13, legWidth, legHeight, legColor, 1);

  container.add([shadow, legLeft, legRight, armLeft, armRight, body, head, face]);
  container.setScale(scaleX, scaleY);
  container.setSize(Math.max(shadowWidth, bodyWidth + armOffset), 40);

  return { container, shadow, body, head, face, armLeft, armRight, legLeft, legRight };
}

export class CharacterView {
  constructor({ scene, player, knightRoles } = {}) {
    this.knightRoles=knightRoles;
    this.knightImage=null;this.knightShadow=null;this.knightRole=null;
    this.knightTicket=0;this.knightElapsed=0;this.knightFrame='S-idle';
    this.scene = scene;
    this.player = player;
    this.phase = 0;
    this.lean = 0;

    player.setAlpha(0);

    const visual = createHumanoidVisual(scene, { x: player.x, y: player.y, depth: 10 });
    this.container = visual.container;
    this.shadow = visual.shadow;
    this.body = visual.body;
    this.head = visual.head;
    this.face = visual.face;
    this.armLeft = visual.armLeft;
    this.armRight = visual.armRight;
    this.legLeft = visual.legLeft;
    this.legRight = visual.legRight;
    this.variantId=ORIGINAL_VISUAL_ID;
    this.pixelView=null;
    this.pixelStep=0;
    this.pixelElapsed=0;
    this.pixelDirection='down';
    // Retain original primitive and its movement untouched; sprite previews
    // are temporary scene visuals, not a second player or a saved costume.
    try{installWalkingTextures(scene);}catch(error){
      console.warn('Optional walk gallery textures unavailable: keeping original',error);
      this.spriteGalleryError=error;
    }
    document.documentElement.dataset.characterVisual=ORIGINAL_VISUAL_ID;
  }

  setVariant(id){
    if(!isCharacterVisualId(id))return false;
    this.knightTicket++;
    this.clearKnightVisual();
    if(this.knightRoles?.selectedRole)this.knightRoles.selectHeroRole(null);
    if(id!==ORIGINAL_VISUAL_ID && (this.spriteGalleryError||
        !this.scene.textures.exists(sheetTextureKey(id))))return false;
    if(id===this.variantId)return true;
    this.variantId=id;
    const isOriginal=id===ORIGINAL_VISUAL_ID;
    this.container.setVisible(isOriginal);
    if(this.pixelView){this.pixelView.destroy();this.pixelView=null;}
    this.pixelStep=0;this.pixelElapsed=0;this.pixelDirection='down';
    for(const key of ['characterVisualFrame','characterVisualScale','characterVisualPerspective'])
      delete document.documentElement.dataset[key];
    if(!isOriginal){
      this.pixelView=this.scene.add.image(this.player.x,this.player.y,
        sheetTextureKey(id),'down-0').setDepth(10).setOrigin(0.5,0.92)
          .setScale(visualScale(id));
      document.documentElement.dataset.characterVisualScale=this.pixelView.scaleX.toFixed(2);
      document.documentElement.dataset.characterVisualPerspective=
        perspectiveDescriptor(id)?.angle||'legacy';
    }
    document.documentElement.dataset.characterVisual=id;
    return true;
  }

  clearKnightVisual(){
    this.knightImage?.destroy();this.knightImage=null;
    this.knightShadow?.destroy();this.knightShadow=null;
    this.knightRole=null;this.knightElapsed=0;
  }
  async setKnight(role,{persist=true}={}){
    if(!this.knightRoles?.ready)return false;
    const ticket=++this.knightTicket;
    let key;
    try{key=await this.knightRoles.texture(role);}catch(error){
      console.warn('Knight role cannot be loaded, using original',error);return false;
    }
    if(ticket!==this.knightTicket||!key||!this.player?.active)return false;
    if(persist)this.knightRoles.selectHeroRole(role);
    this.clearKnightVisual();
    this.pixelView?.destroy();this.pixelView=null;
    this.variantId='knight-role';
    this.knightRole=role;
    this.container.setVisible(false);
    const settings=this.knightRoles.setting(role);
    this.knightShadow=this.scene.add.ellipse(this.player.x,this.player.y+14,
      38*settings.scale,11*settings.scale,0x000000,settings.shadow).setDepth(9);
    this.knightImage=this.scene.add.image(this.player.x,this.player.y+19,key,'S-idle')
      .setOrigin(0.5,0.94).setDepth(10).setScale(settings.scale);
    this.knightElapsed=0;this.knightFrame='S-idle';
    document.documentElement.dataset.characterVisual='knight-role';
    document.documentElement.dataset.characterVisualScale=String(settings.scale);
    document.documentElement.dataset.characterVisualPerspective='eight-way';
    return true;
  }
  refreshKnightRole(){
    const selected=this.knightRoles?.selectedRole;
    if(selected&&this.knightRoles?.ready){
      if(this.variantId!=='knight-role'||this.knightRole!==selected||
         this.knightImage?.texture?.key!==this.knightRoles.textures.get(selected)){
        void this.setKnight(selected,{persist:false});
      }else{
        const cfg=this.knightRoles.setting(selected);
        this.knightImage.setScale(cfg.scale);
        this.knightShadow.setAlpha(cfg.shadow).setScale(cfg.scale);
      }
    }else if(this.variantId==='knight-role')this.setVariant('original');
  }

  update(state, delta) {
    if (!state) return;
    if(this.variantId==='knight-role'&&this.knightImage){
      const dir=knightFacing(state.direction);
      this.knightElapsed=state.moving?this.knightElapsed+delta:0;
      const frame=state.moving?dir+'-'+(Math.floor(this.knightElapsed/105)%11):dir+'-idle';
      this.knightImage.setPosition(this.player.x,this.player.y+19);
      this.knightShadow.setPosition(this.player.x,this.player.y+16);
      if(this.knightFrame!==frame){this.knightImage.setFrame(frame);this.knightFrame=frame;}
      document.documentElement.dataset.characterVisualFrame=frame;
      return;
    }
    if(this.variantId!==ORIGINAL_VISUAL_ID && this.pixelView){
      this.pixelDirection=directionFromVector(state.direction);
      this.pixelElapsed=state.moving?this.pixelElapsed+delta:0;
      this.pixelStep=state.moving?Math.floor(this.pixelElapsed/145)%4:0;
      // Align ground contact in world coordinates for all three apparent sizes.
      this.pixelView.setPosition(this.player.x,this.player.y+19);
      this.pixelView.setFrame(this.pixelDirection+'-'+this.pixelStep);
      document.documentElement.dataset.characterVisualFrame=
        this.pixelDirection+'-'+this.pixelStep;
      return;
    }
    this.container.setPosition(this.player.x, this.player.y);
    const angle = Math.atan2(state.direction.y, state.direction.x) + Math.PI / 2;
    this.container.setRotation(angle);

    if (state.moving) this.phase += delta * (state.dashing ? 0.018 : 0.012);
    else this.phase *= 0.78;

    const targetLean = state.dashing ? 1.45 : state.moving ? 1 : 0;
    this.lean = approach(this.lean, targetLean, delta);

    // Idle: head and torso stay centered over the same footprint.
    // Movement alone projects the upper body forward; dash exaggerates it.
    this.body.y = 4 - this.lean * 5;
    this.head.y = 1 - this.lean * 7;
    this.face.y = -2 - this.lean * 8;

    const swing = state.moving ? Math.sin(this.phase) * 3.2 : 0;
    const armBaseY = 4 - this.lean * 4;
    this.armLeft.y = armBaseY + swing;
    this.armRight.y = armBaseY - swing;
    this.legLeft.y = 13 + this.lean * 1.5 - swing * 0.65;
    this.legRight.y = 13 + this.lean * 1.5 + swing * 0.65;

    this.shadow.y = 9 + this.lean * 0.8;
    this.shadow.height = 10 + this.lean * 1.6;

    const scaleY = state.dashing ? 1.06 : 1;
    this.container.setScale(1, scaleY);
  }

  destroy() {
    this.knightTicket++;this.clearKnightVisual();
    this.pixelView?.destroy();
    this.container?.destroy(true);
    if(document.documentElement.dataset.characterVisual===this.variantId)
      delete document.documentElement.dataset.characterVisual;
    for(const key of ['characterVisualFrame','characterVisualScale','characterVisualPerspective'])
      delete document.documentElement.dataset[key];
  }
}
