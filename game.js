/**
 * PONG — HTML5 Canvas Game
 *  - 3 dedicated customization pages: Theme / Paddles / Ball
 *  - Ball preview canvas, 14 round ball skins
 *  - Paddle styles per player, dynamic sizing, glow slider, theme overrides
 *  - Frame interpolation, AI opponent, sound, 9 themes
 */

/* ------------------------------------------------------------------ */
/*  CONFIGURATION                                                      */
/* ------------------------------------------------------------------ */

const CONFIG = {
  canvasWidth: 800,
  canvasHeight: 500,
  paddleSpeed: 6,
  paddleMargin: 24,
  ballSpeedInitial: 5,
  ballSpeedMax: 11,
  ballSpeedIncrement: 0.4,
  scoreToWin: 11,
  winMargin: 2,
};

/* ---- power-up types ---- */
const POWERUP_TYPES = [
  { id:'bigPaddle',label:'BIG',color:'#44aaff',dur:960 },
  { id:'shield',   label:'S',  color:'#ffaa00',dur:0 },
  { id:'speedUp',  label:'>>', color:'#ff4444',dur:300 },
  { id:'slowOpp',  label:'<<', color:'#aa44ff',dur:480 },
  { id:'dp',       label:'DP', color:'#ffdd00',dur:0 },
  { id:'x3',       label:'x3', color:'#ff66ff',dur:0 },
];

/* ------------------------------------------------------------------ */
/*  COLOR HELPERS                                                      */
/* ------------------------------------------------------------------ */

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return { r: parseInt(h.substring(0,2),16), g: parseInt(h.substring(2,4),16), b: parseInt(h.substring(4,6),16) };
}
function rgbToHex(r,g,b) {
  const c=v=>Math.max(0,Math.min(255,Math.round(v)));
  return '#'+[c(r),c(g),c(b)].map(v=>v.toString(16).padStart(2,'0')).join('');
}
function blendHex(a,b,t) {
  const ca=hexToRgb(a),cb=hexToRgb(b);
  return rgbToHex(ca.r+(cb.r-ca.r)*t,ca.g+(cb.g-ca.g)*t,ca.b+(cb.b-ca.b)*t);
}
function darken(hex,amt) { const{r,g,b}=hexToRgb(hex); return rgbToHex(r*(1-amt),g*(1-amt),b*(1-amt)); }
function lighten(hex,amt) { const{r,g,b}=hexToRgb(hex); return rgbToHex(r+(255-r)*amt,g+(255-g)*amt,b+(255-b)*amt); }
function shiftHue(hex,deg) {
  const{r,g,b}=hexToRgb(hex); const max=Math.max(r,g,b),min=Math.min(r,g,b);
  const l=(max+min)/510; if(max===min) return hex;
  const d=(max-min)/255; let h;
  if(max===r)h=((g-b)/255/d+6)%6; else if(max===g)h=(b-r)/255/d+2; else h=(r-g)/255/d+4;
  h=(h*60+deg)%360; if(h<0)h+=360;
  const c=d,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2; let r1,g1,b1;
  if(h<60){r1=c;g1=x;b1=0;}else if(h<120){r1=x;g1=c;b1=0;}else if(h<180){r1=0;g1=c;b1=x;}
  else if(h<240){r1=0;g1=x;b1=c;}else if(h<300){r1=x;g1=0;b1=c;}else{r1=c;g1=0;b1=x;}
  return rgbToHex((r1+m)*255,(g1+m)*255,(b1+m)*255);
}
function colorWithAlpha(hex,a) { const{r,g,b}=hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; }

/* ------------------------------------------------------------------ */
/*  THEME DEFINITIONS                                                  */
/* ------------------------------------------------------------------ */

const THEMES = {
  classic: {
    bg:'#000000',paddleLeft:'#ffffff',paddleRight:'#ffffff',ball:'#ffffff',
    centerLine:'#333333',text:'#ffffff',
    paddleStyle:'solid',lineStyle:'dashed',glowDefault:0,
    uiBg:'#111111',uiTextDim:'#555555',uiMenuBg:'#111111',
    uiBtnBorder:'#555555',uiBtnHoverBg:'#333333',uiBtnActiveBg:'#555555',
    uiToggleOn:'#00aa00',uiToggleOff:'#660000',
  },
  neon: {
    bg:'#0d0020',paddleLeft:'#00ffff',paddleRight:'#ff00ff',ball:'#ffffff',
    centerLine:'#1a1040',text:'#00ffff',
    paddleStyle:'neon',lineStyle:'dashed',glowDefault:12,
    uiBg:'#0a001a',uiTextDim:'#1a3a4a',uiMenuBg:'rgba(8,0,20,0.94)',
    uiBtnBorder:'#1a4a5a',uiBtnHoverBg:'#0a2a3a',uiBtnActiveBg:'#0f3f5f',
    uiToggleOn:'#00ffff',uiToggleOff:'#440022',
  },
  matrix: {
    bg:'#000000',paddleLeft:'#00ff00',paddleRight:'#00ff00',ball:'#00ff00',
    centerLine:'#0a2a0a',text:'#00ff00',
    paddleStyle:'scanline',lineStyle:'dotted',glowDefault:6,
    uiBg:'#0a0a0a',uiTextDim:'#0a2a0a',uiMenuBg:'rgba(0,0,0,0.94)',
    uiBtnBorder:'#1a3a1a',uiBtnHoverBg:'#0a2a0a',uiBtnActiveBg:'#0a3a0a',
    uiToggleOn:'#00ff00',uiToggleOff:'#330000',
  },
  sunset: {
    bg:'#1a0800',paddleLeft:'#ff6600',paddleRight:'#ffaa00',ball:'#ff4400',
    centerLine:'#331a0a',text:'#ff8833',
    paddleStyle:'gradient',lineStyle:'dashed',glowDefault:8,
    uiBg:'#1a0e05',uiTextDim:'#4a3020',uiMenuBg:'rgba(20,8,0,0.94)',
    uiBtnBorder:'#553322',uiBtnHoverBg:'#2a1a10',uiBtnActiveBg:'#3a2510',
    uiToggleOn:'#ff8833',uiToggleOff:'#442211',
  },
  ocean: {
    bg:'#001020',paddleLeft:'#0099cc',paddleRight:'#0055ff',ball:'#00ddff',
    centerLine:'#0a1a2a',text:'#55bbee',
    paddleStyle:'bevel',lineStyle:'solid',glowDefault:8,
    uiBg:'#051020',uiTextDim:'#1a3040',uiMenuBg:'rgba(0,8,20,0.94)',
    uiBtnBorder:'#1a3a50',uiBtnHoverBg:'#0a1a30',uiBtnActiveBg:'#0d2540',
    uiToggleOn:'#55bbee',uiToggleOff:'#112244',
  },
  midnight: {
    bg:'#050510',paddleLeft:'#7755cc',paddleRight:'#4466aa',ball:'#99bbff',
    centerLine:'#16162a',text:'#9988cc',
    paddleStyle:'rounded',lineStyle:'dashed',glowDefault:10,
    uiBg:'#0a0a15',uiTextDim:'#2a2a40',uiMenuBg:'rgba(4,4,12,0.94)',
    uiBtnBorder:'#2a2a44',uiBtnHoverBg:'#1a1a30',uiBtnActiveBg:'#1f1f38',
    uiToggleOn:'#9988cc',uiToggleOff:'#221144',
  },
  forest: {
    bg:'#081208',paddleLeft:'#33aa33',paddleRight:'#55cc44',ball:'#88ff66',
    centerLine:'#142a14',text:'#55cc55',
    paddleStyle:'gradient',lineStyle:'dotted',glowDefault:6,
    uiBg:'#0a120a',uiTextDim:'#1a3a1a',uiMenuBg:'rgba(4,10,4,0.94)',
    uiBtnBorder:'#1a3a1a',uiBtnHoverBg:'#0a220a',uiBtnActiveBg:'#0d2a0d',
    uiToggleOn:'#55cc55',uiToggleOff:'#223311',
  },
  candy: {
    bg:'#1a0a18',paddleLeft:'#ff55aa',paddleRight:'#55ffcc',ball:'#ffaadd',
    centerLine:'#2a1a28',text:'#ff88cc',
    paddleStyle:'bevel',lineStyle:'dotted',glowDefault:10,
    uiBg:'#150a14',uiTextDim:'#3a1a30',uiMenuBg:'rgba(14,6,12,0.94)',
    uiBtnBorder:'#3a1a30',uiBtnHoverBg:'#1f0a1a',uiBtnActiveBg:'#280d20',
    uiToggleOn:'#ff88cc',uiToggleOff:'#441133',
  },
  monochrome: {
    bg:'#111111',paddleLeft:'#999999',paddleRight:'#cccccc',ball:'#888888',
    centerLine:'#2a2a2a',text:'#bbbbbb',
    paddleStyle:'solid',lineStyle:'solid',glowDefault:3,
    uiBg:'#111111',uiTextDim:'#444444',uiMenuBg:'rgba(10,10,10,0.94)',
    uiBtnBorder:'#444444',uiBtnHoverBg:'#1a1a1a',uiBtnActiveBg:'#222222',
    uiToggleOn:'#aaaaaa',uiToggleOff:'#331111',
  },
};

const PADDLE_STYLES = [
  { key:'solid',    label:'SOLID' },
  { key:'gradient', label:'GRADIENT' },
  { key:'scanline', label:'SCANLINE' },
  { key:'bevel',    label:'BEVEL' },
  { key:'neon',     label:'NEON' },
  { key:'rounded',  label:'ROUNDED' },
];

const BALL_SKINS = [
  { key:'circle',     label:'CIRCLE' },
  { key:'ring',       label:'RING' },
  { key:'basketball', label:'B-BALL' },
  { key:'soccer',     label:'SOCCER' },
  { key:'tennis',     label:'TENNIS' },
  { key:'8ball',      label:'8-BALL' },
  { key:'beachball',  label:'BEACH' },
  { key:'earth',      label:'EARTH' },
  { key:'mars',       label:'MARS' },
  { key:'jupiter',    label:'JUPITER' },
  { key:'saturn',     label:'SATURN' },
  { key:'moon',       label:'MOON' },
  { key:'wood',       label:'WOOD' },
  { key:'metal',      label:'METAL' },
];

/* ------------------------------------------------------------------ */
/*  CUSTOM BALL REGISTRY (localStorage-persisted image uploads)         */
/* ------------------------------------------------------------------ */

const CustomBallRegistry = (()=>{
  const STORE='pong_custom_balls';
  const STORE_OV='pong_ball_overrides';   // { builtinKey: {src, shading} }
  const STORE_HIDE='pong_hidden_builtins'; // [builtinKey]
  const _cache=new Map();   // {id/ov_key: HTMLImageElement}

  function _load(){try{return JSON.parse(localStorage.getItem(STORE)||'[]');}catch(e){return[];}}
  function _save(data){localStorage.setItem(STORE,JSON.stringify(data));}
  function _loadOv(){try{return JSON.parse(localStorage.getItem(STORE_OV)||'{}');}catch(e){return{};}}
  function _saveOv(d){localStorage.setItem(STORE_OV,JSON.stringify(d));}
  function _loadHide(){try{return JSON.parse(localStorage.getItem(STORE_HIDE)||'[]');}catch(e){return[];}}
  function _saveHide(d){localStorage.setItem(STORE_HIDE,JSON.stringify(d));}

  // clear image cache (call when ball changed/deleted)
  function _evict(id){if(_cache.has(id))_cache.delete(id);}

  return {
    /** Get all custom balls as {id, name, src, shading} */
    list(){return _load();},

    /** Get or load the HTMLImageElement for a custom ball */
    image(id){
      if(_cache.has(id))return _cache.get(id);
      const balls=_load(),b=balls.find(b=>b.id===id);
      if(!b)return null;
      const img=new Image();img.src=b.src;_cache.set(id,img);
      return img;
    },

    /** Get metadata for a single custom ball by id */
    get(id){return _load().find(b=>b.id===id)||null;},

    /** Add a new custom ball. Returns the created ball. */
    add(name,src,shading){
      const balls=_load();
      const id='cb_'+Date.now()+'_'+Math.random().toString(36).slice(2,6);
      const ball={id,name,src,shading:!!shading};
      balls.push(ball);_save(balls);
      return ball;
    },

    /** Update an existing custom ball (name, src, shading). Returns updated ball or null. */
    update(id,name,src,shading){
      const balls=_load(),idx=balls.findIndex(b=>b.id===id);
      if(idx===-1)return null;
      if(name!==undefined)balls[idx].name=name;
      if(src!==undefined)balls[idx].src=src;
      if(shading!==undefined)balls[idx].shading=!!shading;
      _save(balls);_evict(id);
      return balls[idx];
    },

    /** Delete a custom ball by id. Returns true if deleted. */
    remove(id){
      const balls=_load(),idx=balls.findIndex(b=>b.id===id);
      if(idx===-1)return false;
      balls.splice(idx,1);_save(balls);_evict(id);
      return true;
    },

    /** Check if a skin key refers to a custom ball */
    isCustom(skinKey){return typeof skinKey==='string'&&skinKey.startsWith('cb_');},

    /* ---- built-in ball overrides ---- */

    /** Get override {src, shading} for a built-in key, or null */
    getOverride(key){return _loadOv()[key]||null;},

    /** Save an override image for a built-in ball */
    setOverride(key,src,shading){
      const ov=_loadOv();ov[key]={src,shading:!!shading};_saveOv(ov);_evict('ov_'+key);
    },

    /** Remove an override, restoring the original procedural ball */
    removeOverride(key){
      const ov=_loadOv();if(ov[key]){delete ov[key];_saveOv(ov);_evict('ov_'+key);return true;}return false;
    },

    /** Get or load the HTMLImageElement for a built-in override */
    overrideImage(key){
      const ck='ov_'+key;
      if(_cache.has(ck))return _cache.get(ck);
      const ov=_loadOv()[key];if(!ov)return null;
      const img=new Image();img.src=ov.src;_cache.set(ck,img);
      return img;
    },

    /* ---- hidden built-ins ---- */
    hiddenList(){return _loadHide();},
    isHidden(key){return _loadHide().includes(key);},
    hide(key){const h=_loadHide();if(!h.includes(key)){h.push(key);_saveHide(h);}},
    unhide(key){const h=_loadHide().filter(k=>k!==key);_saveHide(h);},
  };
})();

/* ------------------------------------------------------------------ */
/*  BALL PAINT EDITOR — full drawing canvas for custom ball textures   */
/* ------------------------------------------------------------------ */

function createBallPaintEditor(){
  const canvas=document.getElementById('paintCanvas');
  if(!canvas)return null;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  const swatchesEl=document.getElementById('paintPalette');
  const sizeSlider=document.getElementById('paintSize');
  const sizeVal=document.getElementById('paintSizeVal');
  const colorInput=document.getElementById('paintColor');
  const loadGrid=document.getElementById('paintLoadGrid');

  // state
  let tool='brush';
  let drawing=false;
  let brushSize=parseInt(sizeSlider.value)||8;
  let color=colorInput.value||'#ff4444';
  let undoStack=[];
  let startX=0,startY=0;
  let snap=null;  // ImageData snapshot for shape previews

  // ---- palette ----
  const PALETTE=[
    '#ff4444','#ff8800','#ffdd00','#44ff44','#00cccc','#4488ff','#8844ff','#ff44ff',
    '#ffffff','#cccccc','#888888','#444444','#111111','#000000',
    '#ffaaaa','#ffcc88','#ffff88','#aaffaa','#88dddd','#aaccff','#ccaaff','#ffaaff',
  ];
  PALETTE.forEach(c=>{
    const s=document.createElement('span');s.className='palette-swatch';
    s.style.backgroundColor=c;s.title=c;
    s.addEventListener('click',()=>{color=c;colorInput.value=c;});
    swatchesEl.appendChild(s);
  });

  // ---- tool buttons ----
  document.querySelectorAll('#paintTools .paint-tool').forEach(b=>{
    b.addEventListener('click',()=>{
      document.querySelectorAll('#paintTools .paint-tool').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');tool=b.dataset.tool;
    });
  });

  // ---- brush size ----
  sizeSlider.addEventListener('input',()=>{
    brushSize=parseInt(sizeSlider.value);sizeVal.textContent=brushSize;
  });
  colorInput.addEventListener('input',()=>{color=colorInput.value;});  return {canvas,ctx,tool,undoStack,loadGrid,
    /** clear canvas + reset undo */
    clear(){
      ctx.clearRect(0,0,canvas.width,canvas.height);
      undoStack=[];this._pushUndo();
    },

    /** reset undo history, using current canvas content as the baseline */
    resetUndo(){
      undoStack=[];this._pushUndo();
    },

    _pushUndo(){
      undoStack.push(ctx.getImageData(0,0,canvas.width,canvas.height));
      if(undoStack.length>20)undoStack.shift();
    },

    undo(){
      if(undoStack.length===0)return;
      const prev=undoStack.pop();
      ctx.putImageData(prev,0,0);
    },

    /** Load a built-in or custom ball onto the canvas as starting image */
    loadBall(skinKey){
      ctx.clearRect(0,0,canvas.width,canvas.height);
      if(CustomBallRegistry.isCustom(skinKey)){
        const img=CustomBallRegistry.image(skinKey);
        if(img&&img.complete){ctx.drawImage(img,0,0,canvas.width,canvas.height);}
      }else{
        // render procedural ball to FILL the canvas (diameter = canvas width) so the
        // inscribed circle matches the in-game clip — otherwise saved balls look smaller
        BallRenderer.draw(ctx,canvas.width/2,canvas.height/2,canvas.width,'#ffffff',skinKey,0);
      }
      undoStack=[];
      this._pushUndo();
    },

    /** Get the canvas as a data URL */
    getDataURL(){return canvas.toDataURL('image/png');},

    // ---- drawing event handlers ----
    onPointerDown(ex,ey){
      const rect=canvas.getBoundingClientRect();
      const scaleX=canvas.width/rect.width;
      const scaleY=canvas.height/rect.height;
      const x=(ex-rect.left)*scaleX;
      const y=(ey-rect.top)*scaleY;
      drawing=true;startX=x;startY=y;

      switch(tool){
        case'brush':case'eraser':
          this._pushUndo();this._drawDot(x,y);break;
        case'fill':
          this._pushUndo();this._floodFill(Math.round(x),Math.round(y));break;
        case'eyedropper':
          this._pickColor(Math.round(x),Math.round(y));break;
        case'line':case'rect':case'circle':
          snap=ctx.getImageData(0,0,canvas.width,canvas.height);break;
        default:break;
      }
    },

    onPointerMove(ex,ey){
      if(!drawing)return;
      const rect=canvas.getBoundingClientRect();
      const scaleX=canvas.width/rect.width;
      const scaleY=canvas.height/rect.height;
      const x=(ex-rect.left)*scaleX;
      const y=(ey-rect.top)*scaleY;

      switch(tool){
        case'brush':this._drawDot(x,y);break;
        case'eraser':
          ctx.save();ctx.globalCompositeOperation='destination-out';this._drawDot(x,y);ctx.restore();break;
        case'line':this._previewLine(x,y);break;
        case'rect':this._previewRect(x,y);break;
        case'circle':this._previewCircle(x,y);break;
      }
    },

    onPointerUp(ex,ey){
      if(!drawing)return;
      const rect=canvas.getBoundingClientRect();
      const scaleX=canvas.width/rect.width;
      const scaleY=canvas.height/rect.height;
      const x=(ex-rect.left)*scaleX;
      const y=(ey-rect.top)*scaleY;

      switch(tool){
        case'line':case'rect':case'circle':
          this._pushUndo();this._commitShape(x,y);break;
      }
      drawing=false;snap=null;
    },

    // -- internals --
    _drawDot(x,y){
      ctx.fillStyle=tool==='eraser'?'rgba(0,0,0,0)':color;
      ctx.beginPath();ctx.arc(x,y,brushSize/2,0,Math.PI*2);ctx.fill();
    },
    _previewLine(x,y){
      if(!snap)return;
      ctx.putImageData(snap,0,0);
      ctx.strokeStyle=color;ctx.lineWidth=brushSize;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(startX,startY);ctx.lineTo(x,y);ctx.stroke();
    },
    _previewRect(x,y){
      if(!snap)return;
      ctx.putImageData(snap,0,0);
      ctx.strokeStyle=color;ctx.lineWidth=brushSize;ctx.lineJoin='round';
      ctx.strokeRect(startX,startY,x-startX,y-startY);
    },
    _previewCircle(x,y){
      if(!snap)return;
      ctx.putImageData(snap,0,0);
      const cx=(startX+x)/2,cy=(startY+y)/2;
      const rx=Math.abs(x-startX)/2,ry=Math.abs(y-startY)/2;
      ctx.strokeStyle=color;ctx.lineWidth=brushSize;
      ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);ctx.stroke();
    },
    _commitShape(x,y){
      switch(tool){
        case'line':
          ctx.strokeStyle=color;ctx.lineWidth=brushSize;ctx.lineCap='round';
          ctx.beginPath();ctx.moveTo(startX,startY);ctx.lineTo(x,y);ctx.stroke();break;
        case'rect':
          ctx.strokeStyle=color;ctx.lineWidth=brushSize;ctx.lineJoin='round';
          ctx.strokeRect(startX,startY,x-startX,y-startY);break;
        case'circle':{
          const cx=(startX+x)/2,cy=(startY+y)/2;
          const rx=Math.abs(x-startX)/2,ry=Math.abs(y-startY)/2;
          ctx.strokeStyle=color;ctx.lineWidth=brushSize;
          ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);ctx.stroke();break;
        }
      }
    },
    _floodFill(sx,sy){
      const imgData=ctx.getImageData(0,0,canvas.width,canvas.height);
      const data=imgData.data,w=canvas.width,h=canvas.height;
      const idx=(sy*w+sx)*4;
      const targetR=data[idx],targetG=data[idx+1],targetB=data[idx+2],targetA=data[idx+3];
      const [fillR,fillG,fillB]=this._hexToRgb(color);
      if(targetR===fillR&&targetG===fillG&&targetB===fillB)return;

      const stack=[[sx,sy]];
      const visited=new Uint8Array(w*h);
      const tol=32;
      while(stack.length){
        const [px,py]=stack.pop();
        const pi=py*w+px;
        if(visited[pi])continue;visited[pi]=1;
        const i=pi*4;
        if(Math.abs(data[i]-targetR)>tol||Math.abs(data[i+1]-targetG)>tol||Math.abs(data[i+2]-targetB)>tol||Math.abs(data[i+3]-targetA)>tol)continue;
        data[i]=fillR;data[i+1]=fillG;data[i+2]=fillB;data[i+3]=255;
        if(px>0)stack.push([px-1,py]);
        if(px<w-1)stack.push([px+1,py]);
        if(py>0)stack.push([px,py-1]);
        if(py<h-1)stack.push([px,py+1]);
      }
      ctx.putImageData(imgData,0,0);
    },
    _pickColor(x,y){
      const px=ctx.getImageData(x,y,1,1).data;
      color='#'+[px[0],px[1],px[2]].map(v=>v.toString(16).padStart(2,'0')).join('');
      colorInput.value=color;
    },
    _hexToRgb(hex){const h=hex.replace('#','');return [parseInt(h.substring(0,2),16),parseInt(h.substring(2,4),16),parseInt(h.substring(4,6),16)];},

    /** Build LOAD BALL popup: snapshots of all ball skins */
    buildLoadGrid(){
      loadGrid.innerHTML='';
      const all=[];
      for(const s of BALL_SKINS)all.push(s);
      for(const c of CustomBallRegistry.list())all.push({key:c.id,label:c.name});
      all.forEach(skin=>{
        const div=document.createElement('div');div.className='paint-load-item';
        const thumb=document.createElement('canvas');thumb.width=36;thumb.height=36;
        const tctx=thumb.getContext('2d');
        BallRenderer.draw(tctx,18,18,32,'#ffffff',skin.key,0);
        const label=document.createElement('span');label.textContent=skin.label;
        div.appendChild(thumb);div.appendChild(label);
        div.addEventListener('click',()=>{this.loadBall(skin.key);loadGrid.classList.add('hidden');});
        loadGrid.appendChild(div);
      });
    },
  };
}

/* ------------------------------------------------------------------ */
/*  BALL RENDERER                                                      */
/* ------------------------------------------------------------------ */

const BallRenderer = {
  draw(ctx,x,y,s,c,skin,t){
    const h=s/2;

    // ---- custom image-based ball ----
    if(CustomBallRegistry.isCustom(skin)){
      const img=CustomBallRegistry.image(skin);
      const meta=CustomBallRegistry.get(skin);
      if(!img||!meta)return;
      this._drawImageBall(ctx,x,y,h,img,meta.shading);
      return;
    }

    // ---- built-in ball with a user override image ----
    const ov=CustomBallRegistry.getOverride(skin);
    if(ov){
      const img=CustomBallRegistry.overrideImage(skin);
      if(img){this._drawImageBall(ctx,x,y,h,img,ov.shading);return;}
    }

    // ---- procedural skins ----
    switch(skin){
      case'circle':
        ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,h,0,Math.PI*2);ctx.fill();break;
      case'ring':
        ctx.strokeStyle=c;ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(x,y,h-1.5,0,Math.PI*2);ctx.stroke();break;
      case'basketball':
        this._basketball(ctx,x,y,h,c);break;
      case'soccer':
        this._soccer(ctx,x,y,h);break;
      case'tennis':
        this._tennis(ctx,x,y,h,c);break;
      case'8ball':
        this._8ball(ctx,x,y,h);break;
      case'beachball':
        this._beachball(ctx,x,y,h);break;
      case'earth':
        this._earth(ctx,x,y,h);break;
      case'mars':
        this._mars(ctx,x,y,h);break;
      case'jupiter':
        this._jupiter(ctx,x,y,h);break;
      case'saturn':
        this._saturn(ctx,x,y,h);break;
      case'moon':
        this._moon(ctx,x,y,h);break;
      case'wood':
        this._wood(ctx,x,y,h,c);break;
      case'metal':
        this._metal(ctx,x,y,h,c);break;
      default:
        ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,h,0,Math.PI*2);ctx.fill();
    }
  },

  // -- shared: draw an image-based ball (custom upload or built-in override)
  _drawImageBall(ctx,x,y,h,img,shading){
    if(!img||!img.complete||img.naturalWidth===0)return;
    ctx.save();
    ctx.beginPath();ctx.arc(x,y,h,0,Math.PI*2);ctx.clip();
    const d=h*2;
    ctx.drawImage(img,x-h,y-h,d,d);
    if(shading){
      const sg=ctx.createRadialGradient(x-h*.3,y-h*.35,h*.03,x,y,h);
      sg.addColorStop(0,'rgba(255,255,255,0)');
      sg.addColorStop(.5,'rgba(255,255,255,0)');
      sg.addColorStop(1,'rgba(0,0,0,.35)');
      ctx.fillStyle=sg;ctx.fillRect(x-h,y-h,d,d);
    }
    ctx.restore();
  },

  // -- basketball: rich burnt orange (#b8511a range), thick black ribs, pebble texture
  _basketball(ctx,x,y,r,c){
    const base='#d45d20';
    const grad=ctx.createRadialGradient(x-r*.25,y-r*.3,r*.08,x,y,r);
    grad.addColorStop(0,'#ef7a29');grad.addColorStop(.5,base);grad.addColorStop(1,'#9a3a10');
    ctx.fillStyle=grad;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#000';ctx.lineWidth=1.8;
    // equator (horizontal, bowed down)
    ctx.beginPath();ctx.moveTo(x-r+1,y);ctx.quadraticCurveTo(x,y+r*.4,x+r-1,y);ctx.stroke();
    // center vertical rib
    ctx.beginPath();ctx.moveTo(x,y-r+1);ctx.lineTo(x,y+r-1);ctx.stroke();
    // left V rib
    ctx.beginPath();ctx.moveTo(x-1,y-r+1);ctx.quadraticCurveTo(x-r*.5,y-r*.15,x-r*.4,y);ctx.stroke();
    ctx.beginPath();ctx.moveTo(x-1,y+r-1);ctx.quadraticCurveTo(x-r*.5,y+r*.15,x-r*.4,y);ctx.stroke();
    // right V rib
    ctx.beginPath();ctx.moveTo(x+1,y-r+1);ctx.quadraticCurveTo(x+r*.5,y-r*.15,x+r*.4,y);ctx.stroke();
    ctx.beginPath();ctx.moveTo(x+1,y+r-1);ctx.quadraticCurveTo(x+r*.5,y+r*.15,x+r*.4,y);ctx.stroke();
    // outline
    ctx.lineWidth=1.6;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();
    // pebble dots
    const dots=this._bballDots||(this._bballDots=Array.from({length:50},()=>({a:Math.random()*Math.PI*2,d:.08+Math.random()*.82})));
    ctx.fillStyle='rgba(0,0,0,.07)';
    for(const{d,a}of dots){ctx.beginPath();ctx.arc(x+Math.cos(a)*d*r,y+Math.sin(a)*d*r,.4,0,Math.PI*2);ctx.fill();}
  },

  // -- soccer: flat 2D hexagon-face view — white center panel, 3 black pentagons, thin seam web
  _soccer(ctx,x,y,r){
    const TAU=Math.PI*2;

    // flat white circle (no shading)
    ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();

    // ---- center: white HEXAGON (6 vertices) ----
    const H6=6;
    const hexR=r*.16;
    const hexAngles=Array.from({length:H6},(_,i)=>TAU/H6*i);  // 0°,60°,120°,180°,240°,300°
    const H=hexAngles.map(a=>({x:x+Math.cos(a)*hexR, y:y+Math.sin(a)*hexR}));

    // ---- 3 black PENTAGONS at alternating hex vertices (0°,120°,240°) ----
    const pentAngles=[0,2,4].map(i=>hexAngles[i]);
    const pentDist=r*.44;    // distance from center
    const pentR=r*.13;       // pentagon size

    const P=pentAngles.map(a=>{
      const cx=x+Math.cos(a)*pentDist, cy=y+Math.sin(a)*pentDist;
      return Array.from({length:5},(_,k)=>({
        x:cx+Math.cos(a+Math.PI+TAU/5*k)*pentR,
        y:cy+Math.sin(a+Math.PI+TAU/5*k)*pentR,
      }));
    });

    // seam thickness
    const sw=Math.max(.7, r*.035);

    // ---- fill black pentagons first ----
    ctx.fillStyle='#111';
    for(const p of P){
      ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);
      for(let k=1;k<5;k++)ctx.lineTo(p[k].x,p[k].y);
      ctx.closePath();ctx.fill();
    }

    // ---- seam network (all thin dark lines) ----
    ctx.strokeStyle='#2a2a2a';ctx.lineWidth=sw;ctx.lineJoin='round';ctx.lineCap='round';

    // center hexagon outline
    ctx.beginPath();ctx.moveTo(H[0].x,H[0].y);
    for(let i=1;i<H6;i++)ctx.lineTo(H[i].x,H[i].y);
    ctx.closePath();ctx.stroke();

    // pentagon-to-hexagon seams: inward vertex of each pentagon to its hex vertex
    for(let pi=0;pi<3;pi++){
      const hi=pi*2;  // hex indices 0,2,4
      ctx.beginPath();ctx.moveTo(H[hi].x,H[hi].y);
      ctx.lineTo(P[pi][0].x,P[pi][0].y);ctx.stroke();
    }

    // pentagon edges
    for(const p of P){
      ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);
      for(let k=1;k<5;k++)ctx.lineTo(p[k].x,p[k].y);
      ctx.closePath();ctx.stroke();
    }

    // connect adjacent pentagons: P[i].vertex[2] to P[(i+1)%3].vertex[3]
    for(let i=0;i<3;i++){
      const j=(i+1)%3;
      ctx.beginPath();ctx.moveTo(P[i][2].x,P[i][2].y);
      ctx.lineTo(P[j][3].x,P[j][3].y);ctx.stroke();
    }

    // outward seams from non-pentagon hex vertices (60°,180°,300°)
    for(let hi=1;hi<H6;hi+=2){  // indices 1,3,5
      const a=hexAngles[hi];
      const ex=x+Math.cos(a)*r*.76, ey=y+Math.sin(a)*r*.76;
      ctx.beginPath();ctx.moveTo(H[hi].x,H[hi].y);
      ctx.lineTo(ex,ey);ctx.stroke();
    }

    // ball rim — thin, dark
    ctx.strokeStyle='#1a1a1a';ctx.lineWidth=Math.max(.8, r*.04);
    ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.stroke();
  },

  // -- tennis: golden yellow (#dcd214), two crossing white seam curves, fuzzy edge
  _tennis(ctx,x,y,r,c){
    const base='#dcd214';
    const grad=ctx.createRadialGradient(x-r*.25,y-r*.3,r*.08,x,y,r);
    grad.addColorStop(0,'#f0e830');grad.addColorStop(.6,base);grad.addColorStop(1,'#b8a808');
    ctx.fillStyle=grad;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
    // seam 1: top-right to bottom-left
    ctx.strokeStyle='#fafaf0';ctx.lineWidth=1.2;
    ctx.beginPath();ctx.moveTo(x+r*.6,y-r*.5);
    ctx.quadraticCurveTo(x,y,x-r*.6,y+r*.5);ctx.stroke();
    // seam 2: top-left to bottom-right
    ctx.beginPath();ctx.moveTo(x-r*.6,y-r*.5);
    ctx.quadraticCurveTo(x,y,x+r*.6,y+r*.5);ctx.stroke();
    // fuzzy edge dashes
    ctx.strokeStyle='rgba(255,255,240,.3)';ctx.lineWidth=.5;
    for(let i=0;i<14;i++){
      const a=Math.PI*2/14*i,bx=x+Math.cos(a)*r*.85,by=y+Math.sin(a)*r*.85;
      ctx.beginPath();ctx.moveTo(bx,by);
      ctx.lineTo(x+Math.cos(a)*r*1.03,y+Math.sin(a)*r*1.03);ctx.stroke();
    }
  },

  // -- 8-ball: glossy black, white number circle with border, specular highlight
  _8ball(ctx,x,y,r){
    const grad=ctx.createRadialGradient(x-r*.25,y-r*.3,r*.06,x,y,r);
    grad.addColorStop(0,'#333');grad.addColorStop(.82,'#111');grad.addColorStop(1,'#000');
    ctx.fillStyle=grad;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#444';ctx.lineWidth=.8;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='#fafafa';ctx.beginPath();ctx.arc(x,y,r*.52,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#333';ctx.lineWidth=.7;ctx.beginPath();ctx.arc(x,y,r*.52,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='#111';ctx.font=`900 ${r*1.05}px Arial,Helvetica,sans-serif`;
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('8',x,y+1);
    ctx.fillStyle='rgba(255,255,255,.22)';ctx.beginPath();ctx.ellipse(x-r*.20,y-r*.28,r*.18,r*.10,-.4,0,Math.PI*2);ctx.fill();
  },

  // -- beachball: 6 alternating panels, 3D shading, white pole dots, valve dot
  _beachball(ctx,x,y,r){
    const cols=['#ffffff','#ee3333','#ffdd00','#3366ff','#ff8800','#33cc44'];
    for(let i=0;i<6;i++){
      const a0=Math.PI*2/6*i-Math.PI*.5,a1=a0+Math.PI*2/6,am=(a0+a1)/2;
      const g=ctx.createRadialGradient(x+Math.cos(am)*r*.3,y+Math.sin(am)*r*.3,0,x,y,r);
      g.addColorStop(0,cols[i]);g.addColorStop(.65,cols[i]);g.addColorStop(1,darken(cols[i],.2));
      ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x,y);
      ctx.arc(x,y,r,a0,a1);ctx.closePath();ctx.fill();
    }
    for(let i=0;i<6;i++){
      const a=Math.PI*2/6*i-Math.PI*.5;
      ctx.strokeStyle='rgba(0,0,0,.15)';ctx.lineWidth=.7;
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(a)*r*.9,y+Math.sin(a)*r*.9);ctx.stroke();
    }
    // white pole cap
    ctx.fillStyle='#fafafa';ctx.beginPath();ctx.arc(x,y,r*.22,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,.2)';ctx.lineWidth=.5;ctx.beginPath();ctx.arc(x,y,r*.22,0,Math.PI*2);ctx.stroke();
    // valve dot
    ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.arc(x,y,r*.06,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,.15)';ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();
  },

  // -- earth: bright cyan ocean (#00ccff), green continents (#009933), white clouds
  _earth(ctx,x,y,r){
    ctx.fillStyle='#00ccff';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
    ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.clip();
    ctx.fillStyle='#009933';
    this._blob(ctx,x-r*.30,y-r*.35,r*.35,r*.30,0);
    this._blob(ctx,x-r*.15,y+r*.15,r*.18,r*.35,15);
    ctx.fillStyle='#00a838';
    this._blob(ctx,x+r*.10,y-r*.30,r*.40,r*.18,1);
    this._blob(ctx,x+.05,y+.25,r*.22,r*.35,16);
    this._blob(ctx,x+r*.35,y+r*.40,r*.14,r*.12,17);
    this._blob(ctx,x-r*.10,y-r*.55,r*.12,r*.10,18);
    ctx.fillStyle='rgba(255,255,255,.35)';
    this._blob(ctx,x-r*.25,y+r*.05,r*.18,r*.06,6);
    this._blob(ctx,x+r*.20,y-r*.20,r*.16,r*.05,7);
    this._blob(ctx,x+.00,y+r*.05,r*.20,r*.04,9);
    ctx.restore();
    ctx.strokeStyle='rgba(0,180,220,.4)';ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();
  },

  // -- mars: red planet with dark highlands, numerous craters, polar ice cap
  _mars(ctx,x,y,r){
    const mg=ctx.createRadialGradient(x-r*.15,y-r*.15,r*.1,x,y,r);
    mg.addColorStop(0,'#dd5530');mg.addColorStop(.7,'#cc4422');mg.addColorStop(1,'#993311');
    ctx.fillStyle=mg;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
    ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.clip();
    // darker highland regions
    ctx.fillStyle='rgba(80,20,10,.3)';
    this._blob(ctx,x-r*.30,y-r*.10,r*.35,r*.22,10);
    this._blob(ctx,x+r*.20,y+r*.35,r*.28,r*.20,11);
    // numerous craters
    ctx.fillStyle=darken('#cc4422',.2);
    const craters=[
      [-.30,-.15,.18],[.22,.18,.14],[-.10,.30,.12],[.35,-.25,.10],
      [-.40,.10,.09],[.08,-.38,.11],[.15,-.10,.07],[-.20,.45,.08],
      [.45,.05,.06],[-.35,-.35,.07],
    ];
    for(const[dx,dy,rr]of craters){ctx.beginPath();ctx.arc(x+r*dx,y+r*dy,r*rr,0,Math.PI*2);ctx.fill();}
    // crater rims (lighter)
    ctx.strokeStyle='rgba(200,150,130,.25)';ctx.lineWidth=.4;
    for(const[dx,dy,rr]of craters){ctx.beginPath();ctx.arc(x+r*dx,y+r*dy,r*rr,0,Math.PI*2);ctx.stroke();}
    // polar ice cap
    ctx.fillStyle='#eeddcc';ctx.beginPath();ctx.ellipse(x,y-r*.72,r*.48,r*.14,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba(255,240,230,.4)';ctx.beginPath();ctx.ellipse(x,y-r*.76,r*.38,r*.10,0,0,Math.PI*2);ctx.fill();
    ctx.restore();
    ctx.strokeStyle='#772211';ctx.lineWidth=.8;
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();
  },

  // -- jupiter: detailed bands with turbulence, prominent Great Red Spot
  _jupiter(ctx,x,y,r){
    ctx.fillStyle='#d4b896';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
    ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.clip();
    const bands=[
      {dy:-.60,h:.14,c:'#c09560'},{dy:-.45,h:.12,c:'#e8d0b0'},
      {dy:-.32,h:.16,c:'#b88050'},{dy:-.15,h:.13,c:'#e8d5c0'},
      {dy:-.02,h:.18,c:'#c09060'},{dy:.16, h:.14,c:'#e0c8a8'},
      {dy:.30, h:.16,c:'#b87850'},{dy:.47, h:.12,c:'#e8d0b0'},
      {dy:.60, h:.14,c:'#c09560'},
    ];
    for(const b of bands){ctx.fillStyle=b.c;ctx.fillRect(x-r,y+r*b.dy-r*b.h/2,r*2,r*b.h);}
    // Great Red Spot with inner detail
    ctx.fillStyle='#d4594a';ctx.beginPath();ctx.ellipse(x+r*.3,y+r*.18,r*.24,r*.13,.3,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#e8806a';ctx.beginPath();ctx.ellipse(x+r*.3,y+r*.16,r*.16,r*.08,.3,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#c04030';ctx.beginPath();ctx.ellipse(x+r*.32,y+r*.19,r*.08,r*.04,.3,0,Math.PI*2);ctx.fill();
    // smaller storms
    ctx.fillStyle='#e8c090';ctx.beginPath();ctx.ellipse(x-r*.25,y+r*.30,r*.10,r*.04,-.2,0,Math.PI*2);ctx.fill();
    ctx.restore();
    ctx.strokeStyle='#8a6040';ctx.lineWidth=.8;
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();
  },

  // -- saturn: multi-band ring with Cassini gap, planet shading, ring shadow
  _saturn(ctx,x,y,r){
    const TAU=Math.PI*2;
    // back half of outer ring (PI to 2PI = top half, behind planet)
    ctx.strokeStyle='#c8b870';ctx.lineWidth=r*.22;
    ctx.beginPath();ctx.ellipse(x,y,r*1.62,r*.30,0,Math.PI,TAU);ctx.stroke();
    // back half of inner ring
    ctx.strokeStyle='#e0d0a8';ctx.lineWidth=r*.14;
    ctx.beginPath();ctx.ellipse(x,y,r*1.34,r*.22,0,Math.PI,TAU);ctx.stroke();
    // planet body with gradient
    const pgrad=ctx.createRadialGradient(x-r*.2,y-r*.15,r*.05,x,y,r);
    pgrad.addColorStop(0,'#f5edc8');pgrad.addColorStop(.6,'#e8d5a0');pgrad.addColorStop(1,'#c8b070');
    ctx.fillStyle=pgrad;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
    // planet bands
    ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.clip();
    const sbands=[
      {dy:-.50,h:.14,c:'#d4c080'},{dy:-.20,h:.16,c:'#f2e8c8'},
      {dy:.05, h:.18,c:'#d8c888'},{dy:.25, h:.15,c:'#f0e0b8'},
      {dy:.45, h:.14,c:'#d4c080'},
    ];
    for(const b of sbands){ctx.fillStyle=b.c;ctx.fillRect(x-r,y+r*b.dy-r*b.h/2,r*2,r*b.h);}
    // ring shadow on planet
    ctx.fillStyle='rgba(0,0,0,.08)';ctx.fillRect(x-r,y-r*.1,r*2,r*.2);
    ctx.restore();
    // planet outline
    ctx.strokeStyle='#b8a060';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.stroke();
    // front half of inner ring (0 to PI = bottom half, in front of planet)
    ctx.strokeStyle='#e0d0a8';ctx.lineWidth=r*.14;
    ctx.beginPath();ctx.ellipse(x,y,r*1.34,r*.22,0,0,Math.PI);ctx.stroke();
    // Cassini division outline (front)
    ctx.strokeStyle='rgba(0,0,0,.15)';ctx.lineWidth=.6;
    ctx.beginPath();ctx.ellipse(x,y,r*1.48,r*.26,0,0,Math.PI);ctx.stroke();
    // front half of outer ring
    ctx.strokeStyle='#d4c898';ctx.lineWidth=r*.22;
    ctx.beginPath();ctx.ellipse(x,y,r*1.62,r*.30,0,0,Math.PI);ctx.stroke();
    // full ring edge outlines
    ctx.strokeStyle='#b0a060';ctx.lineWidth=1;
    ctx.beginPath();ctx.ellipse(x,y,r*1.62,r*.30,0,0,TAU);ctx.stroke();
    ctx.strokeStyle='#b0a060';ctx.lineWidth=.8;
    ctx.beginPath();ctx.ellipse(x,y,r*1.34,r*.22,0,0,TAU);ctx.stroke();
  },

  // -- moon: spherical gradient, dark maria, craters with rims
  _moon(ctx,x,y,r){
    const mg=ctx.createRadialGradient(x-r*.25,y-r*.25,r*.1,x,y,r);
    mg.addColorStop(0,'#e0e0e0');mg.addColorStop(.75,'#c0c0c0');mg.addColorStop(1,'#9a9a9a');
    ctx.fillStyle=mg;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
    // dark maria regions
    ctx.fillStyle='rgba(130,130,135,.35)';
    this._blob(ctx,x+r*.15,y+.15,r*.30,r*.22,12);
    this._blob(ctx,x-r*.20,y-.10,r*.25,r*.18,13);
    this._blob(ctx,x-.05,y+.30,r*.22,r*.15,14);
    // craters with lighter rims
    const craters=[
      [-.30,-.20,.18],[.25,.10,.14],[-.05,.35,.12],[.40,-.30,.10],
      [-.45,.25,.09],[.10,-.38,.11],[-.15,-.35,.07],[.35,.30,.06],
    ];
    const crc=darken('#c0c0c0',.2);
    for(const[dx,dy,rr]of craters){
      ctx.fillStyle=crc;ctx.beginPath();ctx.arc(x+r*dx,y+r*dy,r*rr,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='rgba(220,220,220,.4)';ctx.lineWidth=.4;
      ctx.beginPath();ctx.arc(x+r*dx,y+r*dy,r*rr,0,Math.PI*2);ctx.stroke();
    }
    ctx.strokeStyle='#999';ctx.lineWidth=.8;
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();
  },

  // -- wood: radial gradient, wood knot, multiple grain arcs, dark rim
  _wood(ctx,x,y,r,c){
    const base=blendHex(c,'#8B6914',.5);
    const wg=ctx.createRadialGradient(x-r*.2,y-r*.2,r*.1,x,y,r);
    wg.addColorStop(0,lighten(base,.1));wg.addColorStop(.7,base);wg.addColorStop(1,darken(base,.25));
    ctx.fillStyle=wg;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
    ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.clip();
    // wood knot
    const kx=x+r*.2,ky=y-r*.15;
    ctx.fillStyle=darken(base,.3);ctx.beginPath();ctx.ellipse(kx,ky,r*.12,r*.08,.5,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=darken(base,.4);ctx.lineWidth=.6;
    ctx.beginPath();ctx.ellipse(kx,ky,r*.18,r*.12,.5,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.ellipse(kx,ky,r*.24,r*.16,.5,0,Math.PI*2);ctx.stroke();
    // grain arcs
    ctx.strokeStyle=darken(base,.2);ctx.lineWidth=.6;
    const grains=[
      {dy:-.48,rx:.78},{dy:-.22,rx:.92},{dy:.02,rx:.85},
      {dy:.22,rx:.80},{dy:.40,rx:.72},{dy:-.10,rx:.95},
    ];
    for(const g of grains){
      ctx.beginPath();ctx.moveTo(x-g.rx*r,y+r*g.dy);
      ctx.quadraticCurveTo(x,y+r*g.dy-g.rx*r*.12,x+g.rx*r,y+r*g.dy);ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle=darken(base,.4);ctx.lineWidth=1.1;
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();
  },

  // -- metal: multi-band reflection, dark edge, sharp highlight
  _metal(ctx,x,y,r,c){
    const base=blendHex(c,'#aaaaaa',.5);
    const bg=ctx.createRadialGradient(x-r*.25,y-r*.25,r*.15,x,y,r);
    bg.addColorStop(0,'#e8e8e8');bg.addColorStop(.3,'#c8c8c8');
    bg.addColorStop(.55,darken(base,.1));bg.addColorStop(.7,'#b0b0b0');
    bg.addColorStop(.85,darken(base,.2));bg.addColorStop(1,darken(base,.4));
    ctx.fillStyle=bg;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
    // reflection bands
    ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.clip();
    ctx.fillStyle='rgba(255,255,255,.18)';
    ctx.fillRect(x-r,y-r*.15,r*2,r*.18);
    ctx.fillStyle='rgba(255,255,255,.10)';
    ctx.fillRect(x-r,y+r*.35,r*2,r*.10);
    ctx.restore();
    // sharp highlight spot
    const hg=ctx.createRadialGradient(x-r*.18,y-r*.22,0,x-r*.18,y-r*.22,r*.35);
    hg.addColorStop(0,'rgba(255,255,255,.7)');hg.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=hg;ctx.beginPath();ctx.arc(x-r*.18,y-r*.22,r*.35,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=darken(base,.35);ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();
  },

  // -- blob helper for earth continents
  _blob(ctx,cx,cy,rx,ry,idx){
    const ang=[.12,-.18,.06,-.09,.22,-.14,.03,.30,.08,-.05,.16,-.11,.20,-.07,.04,-.22,.10,.14];
    ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,ang[idx%ang.length],0,Math.PI*2);ctx.fill();
  },
};

/* ------------------------------------------------------------------ */
/*  PADDLE RENDERER                                                    */
/* ------------------------------------------------------------------ */

const PaddleRenderer = {
  draw(ctx,x,y,w,h,c,style){
    switch(style){
      case'solid':ctx.fillStyle=c;ctx.fillRect(x,y,w,h);break;
      case'gradient':{
        const g=ctx.createLinearGradient(x,y,x,y+h);g.addColorStop(0,lighten(c,.25));g.addColorStop(.5,c);g.addColorStop(1,darken(c,.25));
        ctx.fillStyle=g;ctx.fillRect(x,y,w,h);break;
      }
      case'scanline':{
        ctx.fillStyle=c;ctx.fillRect(x,y,w,h);ctx.fillStyle=darken(c,.18);
        for(let sy=y+4;sy<y+h;sy+=7)ctx.fillRect(x+1,sy,w-2,3);break;
      }
      case'bevel':{
        ctx.fillStyle=c;ctx.fillRect(x,y,w,h);
        ctx.fillStyle=lighten(c,.35);ctx.fillRect(x,y,2,h);
        ctx.fillStyle=darken(c,.35);ctx.fillRect(x+w-2,y,2,h);
        ctx.fillStyle=lighten(c,.2);ctx.fillRect(x,y,w,2);
        ctx.fillStyle=darken(c,.2);ctx.fillRect(x,y+h-2,w,2);break;
      }
      case'neon':{
        ctx.save();ctx.shadowBlur=10;ctx.shadowColor=c;ctx.fillStyle=c;ctx.fillRect(x,y,w,h);
        ctx.shadowBlur=0;ctx.fillStyle=lighten(c,.25);ctx.fillRect(x+1.5,y+1.5,w-3,h-3);ctx.restore();break;
      }
      case'rounded':{
        const r=Math.min(5,w/2);ctx.fillStyle=c;ctx.beginPath();
        ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);
        ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
        ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);
        ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();ctx.fill();break;
      }
    }
  },
};

/* ------------------------------------------------------------------ */
/*  SOUND ENGINE                                                       */
/* ------------------------------------------------------------------ */

class SoundEngine {
  constructor(){this.ctx=null;this.initialized=false;}
  init(){if(this.initialized)return;try{this.ctx=new(window.AudioContext||window.webkitAudioContext)();this.initialized=true;}catch(e){}}
  play(type){
    if(!this.initialized)this.init();if(!this.ctx)return;if(this.ctx.state==='suspended')this.ctx.resume();
    const t=this.ctx.currentTime;
    const n=(freq,start,dur,gainVal,wave)=>{
      const o=this.ctx.createOscillator(),g=this.ctx.createGain();
      o.type=wave||'square';o.frequency.setValueAtTime(freq,start);
      g.gain.setValueAtTime(gainVal,start);g.gain.exponentialRampToValueAtTime(.001,start+dur);
      o.connect(g).connect(this.ctx.destination);o.start(start);o.stop(start+dur);
    };
    switch(type){
      case'paddle':n(440,t,.08,.15);n(220,t+.01,.07,.08);break;
      case'wall':n(300,t,.05,.08);break;
      case'score':n(660,t,.15,.12);n(880,t+.1,.15,.12);break;
      case'win':n(523,t,.2,.12);n(659,t+.15,.2,.12);n(784,t+.3,.2,.12);n(1047,t+.45,.25,.14);break;
      case'start':n(440,t,.12,.1,'triangle');n(554,t+.12,.12,.1,'triangle');n(660,t+.24,.12,.1,'triangle');break;
    }
  }
}

/* ------------------------------------------------------------------ */
/*  PARTICLE                                                           */
/* ------------------------------------------------------------------ */

class Particle {
  constructor(x,y,color){
    this.x=x;this.y=y;this.prevX=x;this.prevY=y;
    const ang=Math.random()*Math.PI*2,sp=1+Math.random()*3;
    this.vx=Math.cos(ang)*sp;this.vy=Math.sin(ang)*sp;
    this.life=1;this.decay=.015+Math.random()*.025;this.size=2+Math.random()*3;this.color=color;
  }
  update(){this.prevX=this.x;this.prevY=this.y;this.x+=this.vx;this.y+=this.vy;this.life-=this.decay;}
  draw(ctx,alpha){
    const rx=this.prevX+(this.x-this.prevX)*alpha,ry=this.prevY+(this.y-this.prevY)*alpha;
    ctx.save();ctx.globalAlpha=this.life;ctx.fillStyle=this.color;
    ctx.fillRect(rx-this.size/2,ry-this.size/2,this.size,this.size);ctx.restore();
  }
  get dead(){return this.life<=0;}
}

/* ------------------------------------------------------------------ */
/*  PADDLE                                                             */
/* ------------------------------------------------------------------ */

class Paddle {
  constructor(x,y,w,h,color){
    this.x=x;this.y=y;this.prevY=y;this.width=w;this.height=h;this.color=color;this.score=0;this.vy=0;
  }
  update(boundsH){
    this.prevY=this.y;this.y+=this.vy;
    if(this.y<0)this.y=0;if(this.y+this.height>boundsH)this.y=boundsH-this.height;
  }
  draw(ctx,style){PaddleRenderer.draw(ctx,this.x,this.y,this.width,this.height,this.color,style);}
  drawInterpolated(ctx,style,alpha){
    const iy=this.prevY+(this.y-this.prevY)*alpha;
    PaddleRenderer.draw(ctx,this.x,iy,this.width,this.height,this.color,style);
  }
  reset(boundsH){this.y=(boundsH-this.height)/2;this.prevY=this.y;this.vy=0;}
  setDimensions(w,h){this.width=w;this.height=h;}
}

/* ------------------------------------------------------------------ */
/*  BALL                                                               */
/* ------------------------------------------------------------------ */

class Ball {
  constructor(x,y,s,color){
    this.x=x;this.y=y;this.prevX=x;this.prevY=y;this.size=s;this.color=color;this.skin='circle';this.dx=0;this.dy=0;this.speed=CONFIG.ballSpeedInitial;
    this.angle=0;this.spin=0;
  }
  reset(cw,ch,dir){
    this.x=cw/2;this.y=ch/2;this.prevX=this.x;this.prevY=this.y;this.speed=CONFIG.ballSpeedInitial;
    const ang=Math.random()*.8-.4;this.dx=Math.cos(ang)*this.speed*dir;this.dy=Math.sin(ang)*this.speed;
    this.angle=0;this.spin=0;
  }
  update(){this.prevX=this.x;this.prevY=this.y;this.x+=this.dx;this.y+=this.dy;this.angle+=this.spin;this.spin*=.998;}
  draw(ctx,t){ctx.save();ctx.translate(this.x,this.y);ctx.rotate(this.angle);ctx.translate(-this.x,-this.y);
    BallRenderer.draw(ctx,this.x,this.y,this.size,this.color,this.skin,t);ctx.restore();}
  drawInterpolated(ctx,t,alpha){
    const ix=this.prevX+(this.x-this.prevX)*alpha,iy=this.prevY+(this.y-this.prevY)*alpha;
    ctx.save();ctx.translate(ix,iy);ctx.rotate(this.angle);ctx.translate(-ix,-iy);
    BallRenderer.draw(ctx,ix,iy,this.size,this.color,this.skin,t);ctx.restore();
  }
}

/* ------------------------------------------------------------------ */
/*  AI OPPONENT                                                        */
/* ------------------------------------------------------------------ */

class AIOpponent {
  constructor(diff){this.difficulty=diff;this.reactTimer=0;this.targetY=CONFIG.canvasHeight/2;}
  update(paddle,balls,ch){
    this.reactTimer--;
    if(this.reactTimer<=0){this.targetY=this._pickTarget(paddle,balls,ch);this.reactTimer=this._reactionDelay();}
    const sp=this._speed(),c=paddle.y+paddle.height/2,d=this.targetY-c;
    if(Math.abs(d)<3){paddle.vy=0;paddle.y=this.targetY-paddle.height/2;}
    else{const tv=d>0?sp:-sp;paddle.vy+=(tv-paddle.vy)*.25;}
  }
  _reactionDelay(){switch(this.difficulty){case'easy':return 12+Math.floor(Math.random()*18);case'medium':return 3+Math.floor(Math.random()*8);case'hard':return 1;}}
  _speed(){return CONFIG.paddleSpeed;}
  _pickTarget(paddle,balls,ch){
    if(balls.length>1)return this._frenzyTarget(paddle,balls,ch);
    return this._track(paddle,balls[0],ch);
  }
  _frenzyTarget(paddle,balls,ch){
    let best=null,bestS=-Infinity;
    for(const b of balls){
      if(b.dx<=0)continue;
      const dist=CONFIG.canvasWidth-b.x,vert=Math.abs(b.y-(paddle.y+paddle.height/2));
      let s=-(dist*2+vert);
      if(this.difficulty==='easy')s+=Math.random()*80-40;
      if(this.difficulty==='medium')s+=Math.random()*30-15;
      if(s>bestS){bestS=s;best=b;}
    }
    return best?this._track(paddle,best,ch):ch/2;
  }
  _track(paddle,b,ch){
    if(b.dx<=0)return ch/2;
    switch(this.difficulty){
      case'easy':return b.y+(Math.random()-.5)*100;
      case'medium':return b.y+(Math.random()-.5)*40;
      case'hard':return this._predict(b,ch);
    }
  }
  _predict(b,ch){
    let bx=b.x,by=b.y,bdx=b.dx,bdy=b.dy,hb=b.size/2;
    const tx=CONFIG.canvasWidth-CONFIG.paddleMargin-CONFIG.paddleWidth;
    while(bx<tx){bx+=bdx;by+=bdy;if(by-hb<=0){by=hb;bdy=Math.abs(bdy);}else if(by+hb>=ch){by=ch-hb;bdy=-Math.abs(bdy);}}
    return by;
  }
}

/* ------------------------------------------------------------------ */
/*  INPUT HANDLER                                                      */
/* ------------------------------------------------------------------ */

class InputHandler {
  constructor(){this.keys={};this._onDown=this._onDown.bind(this);this._onUp=this._onUp.bind(this);window.addEventListener('keydown',this._onDown);window.addEventListener('keyup',this._onUp);}
  _isTyping(e){const t=e.target;return t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable);}
  _onDown(e){if(this._isTyping(e))return;this.keys[e.key]=true;if(['ArrowUp','ArrowDown','w','s','W','S',' ','Escape'].includes(e.key))e.preventDefault();}
  _onUp(e){if(this._isTyping(e))return;this.keys[e.key]=false;}
  isDown(key){return!!this.keys[key];}
  destroy(){window.removeEventListener('keydown',this._onDown);window.removeEventListener('keyup',this._onUp);}
}

/* ------------------------------------------------------------------ */
/*  SETTINGS                                                           */
/* ------------------------------------------------------------------ */

const settings = {
  gameMode:'pvp',difficulty:'medium',soundEnabled:true,effectsEnabled:true,
  gameVariant:'classic',
  theme:'classic',
  themeOverrideBg:null,
  themeOverrideAccent:null,
  themeOverrideGlow:null,
  leftPaddleStyle:null,
  rightPaddleStyle:null,
  customPaddleLeft:null,
  customPaddleRight:null,
  paddleWidth:14,
  paddleHeight:90,
  ballSkin:'circle',
  customBall:null,
  ballSize:16,
};

/* ------------------------------------------------------------------ */
/*  CSS THEME APPLICATION                                              */
/* ------------------------------------------------------------------ */

function buildGlowCSS(intensity,color){
  if(intensity<=0)return'none';
  return `0 0 ${intensity}px ${color}, 0 0 ${intensity*2}px ${color}`;
}

function applyThemeCSS(themeName){
  const t=THEMES[themeName];if(!t)return;
  const bg=settings.themeOverrideBg||t.bg;
  const accent=settings.themeOverrideAccent||t.text;
  const glowVal=settings.themeOverrideGlow!==null?settings.themeOverrideGlow:t.glowDefault;
  const glow=buildGlowCSS(glowVal,accent);
  const r=document.documentElement.style;
  r.setProperty('--bg',t.uiBg);r.setProperty('--canvas-bg',bg);
  r.setProperty('--text',accent);r.setProperty('--text-dim',t.uiTextDim);
  r.setProperty('--paddle-left',t.paddleLeft);r.setProperty('--paddle-right',t.paddleRight);
  r.setProperty('--ball',t.ball);r.setProperty('--center-line',t.centerLine);
  r.setProperty('--accent',accent);r.setProperty('--accent-glow',glow);
  r.setProperty('--menu-bg',t.uiMenuBg);r.setProperty('--btn-border',t.uiBtnBorder);
  r.setProperty('--btn-hover-bg',t.uiBtnHoverBg);r.setProperty('--btn-active-bg',t.uiBtnActiveBg);
  r.setProperty('--toggle-on',t.uiToggleOn);r.setProperty('--toggle-off',t.uiToggleOff);
  document.documentElement.setAttribute('data-theme',themeName);
}

/* ------------------------------------------------------------------ */
/*  GAME                                                                */
/* ------------------------------------------------------------------ */

class PongGame {
  constructor(canvas,scoreLeftEl,scoreRightEl){
    this.canvas=canvas;this.ctx=canvas.getContext('2d');
    this.scoreLeftEl=scoreLeftEl;this.scoreRightEl=scoreRightEl;
    this.input=new InputHandler();this.sound=new SoundEngine();this.ai=null;
    const mX=CONFIG.canvasWidth/2,mY=CONFIG.canvasHeight/2;
    this.paddleLeft=new Paddle(CONFIG.paddleMargin-7,mY-45,14,90,'#ffffff');
    this.paddleRight=new Paddle(CONFIG.canvasWidth-CONFIG.paddleMargin-7,mY-45,14,90,'#ffffff');
    this.ball=new Ball(mX,mY,16,'#ffffff');this.particles=[];
    this.state='idle';this.active=false;this.paused=false;this.serveDirection=1;this.serveTimer=0;this.winMessage='';
    // power-up state
    this.lastHitBy=null;this.powerUp=null;this.puSpawnTimer=240;
    this.puEffects={lBig:0,rBig:0,lShield:0,rShield:0,ballSpd:0,lSlow:0,rSlow:0,dpLeft:false,dpRight:false};
    this.ballSpeedMod=1;
    this.multiBalls=[];
    this.lastTime=0;this.accumulator=0;this.tickRate=1000/60;
    this._loop=this._loop.bind(this);this.ball.reset(CONFIG.canvasWidth,CONFIG.canvasHeight,0);this._loop(0);
  }

  start(){
    this._applySettings();this.active=true;this.paused=false;
    this.ai=settings.gameMode==='ai'?new AIOpponent(settings.difficulty):null;
    this._syncDimensions();this._resetGame();this.transition('serving');
  }
  restart(){this.paused=false;this._resetGame();this.transition('serving');}
  _applySettings(){this._applyThemeAndColors();if(settings.gameVariant!=='frenzy')this.ball.skin=settings.ballSkin;applyThemeCSS(settings.theme);}
  _applyThemeAndColors(){
    const t=THEMES[settings.theme];
    if(settings.gameVariant!=='frenzy'){
      this.paddleLeft.color=settings.customPaddleLeft||t.paddleLeft;
      this.paddleRight.color=settings.customPaddleRight||t.paddleRight;
      this.ball.color=settings.customBall||t.ball;
    }else{
      this.paddleLeft.color=settings.customPaddleLeft||t.paddleLeft;
      this.paddleRight.color=settings.customPaddleRight||t.paddleRight;
    }
  }
  _syncDimensions(){
    this.paddleLeft.setDimensions(settings.paddleWidth,settings.paddleHeight);
    this.paddleRight.setDimensions(settings.paddleWidth,settings.paddleHeight);
    this.paddleLeft.x=CONFIG.paddleMargin-settings.paddleWidth/2;
    this.paddleRight.x=CONFIG.canvasWidth-CONFIG.paddleMargin-settings.paddleWidth/2;
    this.ball.size=settings.ballSize;
    this.paddleLeft.reset(CONFIG.canvasHeight);
    this.paddleRight.reset(CONFIG.canvasHeight);
  }
  switchTheme(name){
    settings.theme=name;
    settings.themeOverrideBg=null;settings.themeOverrideAccent=null;settings.themeOverrideGlow=null;
    settings.leftPaddleStyle=null;settings.rightPaddleStyle=null;
    this._applyThemeAndColors();applyThemeCSS(name);
  }
  getTheme(){return THEMES[settings.theme];}
  getLeftPaddleStyle(){return settings.leftPaddleStyle||this.getTheme().paddleStyle;}
  getRightPaddleStyle(){return settings.rightPaddleStyle||this.getTheme().paddleStyle;}
  _resetGame(){
    this.paddleLeft.score=0;this.paddleRight.score=0;
    this.paddleLeft.reset(CONFIG.canvasHeight);this.paddleRight.reset(CONFIG.canvasHeight);
    this.ball.reset(CONFIG.canvasWidth,CONFIG.canvasHeight,1);this.particles=[];this.serveDirection=Math.random()<.5?1:-1;
    this.lastHitBy=null;this.powerUp=null;this.puSpawnTimer=240;
    this.puEffects={lBig:0,rBig:0,lShield:0,rShield:0,ballSpd:0,lSlow:0,rSlow:0,dpLeft:false,dpRight:false};
    this.ballSpeedMod=1;this.multiBalls=[];
  }
  _spawnFrenzyBalls(){
    const skins=[...BALL_SKINS];
    const sc={circle:'#f0f0f0',ring:'#f0f0f0',basketball:'#e87400',soccer:'#1a1a1a',tennis:'#dcd214','8ball':'#222',beachball:'#ee3333',earth:'#009933',mars:'#cc4422',jupiter:'#d4b896',saturn:'#e8d5a0',moon:'#c0c0c0',wood:'#8B6914',metal:'#b0b0b0'};
    for(let i=skins.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[skins[i],skins[j]]=[skins[j],skins[i]];}
    this.ball.skin=skins[0].key;this.ball.color=sc[skins[0].key];
    for(let i=1;i<14;i++){
      const b=new Ball(CONFIG.canvasWidth/2,CONFIG.canvasHeight/2,this.ball.size,sc[skins[i].key]);
      b.skin=skins[i].key;const ang=Math.random()*Math.PI*2;
      b.dx=Math.cos(ang)*b.speed*(Math.random()<.5?1:-1);b.dy=Math.sin(ang)*b.speed;
      this.multiBalls.push(b);
    }
  }

  transition(newState){
    const prev=this.state;this.state=newState;this.serveTimer=0;
    if(newState==='goal'){
      if(settings.soundEnabled)this.sound.play('score');
      if(settings.effectsEnabled){for(let i=0;i<24;i++)this.particles.push(new Particle(this.ball.x,this.ball.y,this.ball.color));}
      const wr=this._checkWin();if(wr){this.winMessage='PLAYER '+wr+' WINS!';this.state='over';if(settings.soundEnabled)this.sound.play('win');}
    }
    if(newState==='serving'){this.paddleLeft.reset(CONFIG.canvasHeight);this.paddleRight.reset(CONFIG.canvasHeight);this.ball.reset(CONFIG.canvasWidth,CONFIG.canvasHeight,this.serveDirection);this.multiBalls=[];if(settings.gameVariant==='frenzy')this._spawnFrenzyBalls();}
    if(newState==='playing'&&prev!=='playing'){if(settings.soundEnabled)this.sound.play('start');}
  }
  _checkWin(){
    if(this.paddleLeft.score>=CONFIG.scoreToWin&&this.paddleLeft.score-this.paddleRight.score>=CONFIG.winMargin)return 1;
    if(this.paddleRight.score>=CONFIG.scoreToWin&&this.paddleRight.score-this.paddleLeft.score>=CONFIG.winMargin)return 2;
    return null;
  }

  _loop(ts){
    requestAnimationFrame(this._loop);if(this.lastTime===0){this.lastTime=ts;return;}
    const dt=ts-this.lastTime;this.lastTime=ts;this.accumulator+=dt;
    while(this.accumulator>=this.tickRate){if(!this.paused)this._update();this.accumulator-=this.tickRate;}
    if(this.state==='playing'&&settings.gameVariant==='powerups')this._updatePowerUps();
    this._updateEffects();
    this._draw(ts);
  }

  _update(){
    switch(this.state){case'idle':this._updateIdle();break;case'serving':this._updateServing();break;case'playing':this._updatePlaying();break;case'goal':this._updateGoal();break;case'over':this._updateOver();break;}
    for(let i=this.particles.length-1;i>=0;i--){this.particles[i].update();if(this.particles[i].dead)this.particles.splice(i,1);}
  }
  _updateIdle(){if(this.active&&this.input.isDown(' ')){this.sound.init();this.start();}}
  _updateServing(){if(++this.serveTimer>90)this.transition('playing');}
  _updatePlaying(){
    this._handleInput();
    this.paddleLeft.update(CONFIG.canvasHeight);
    if(this.ai){this.ai.update(this.paddleRight,[this.ball,...this.multiBalls],CONFIG.canvasHeight);if(this.puEffects.rSlow>0)this.paddleRight.vy*=.4;}
    this.paddleRight.update(CONFIG.canvasHeight);
    this.ball.update();
    for(const b of this.multiBalls)b.update();
    // ball-ball collisions
    for(const b of this.multiBalls)this._ballCollision(this.ball,b);
    for(let i=0;i<this.multiBalls.length;i++)
      for(let j=i+1;j<this.multiBalls.length;j++)this._ballCollision(this.multiBalls[i],this.multiBalls[j]);
    // check main ball
    if(this._checkBall(this.ball)&&this.multiBalls.length>0){const b=this.multiBalls.pop();this.ball.x=b.x;this.ball.y=b.y;this.ball.prevX=b.x;this.ball.prevY=b.y;this.ball.dx=b.dx;this.ball.dy=b.dy;this.ball.speed=b.speed;this.ball.spin=b.spin;this.ball.angle=b.angle;this.ball.skin=b.skin;this.ball.color=b.color;}
    // check multi balls
    for(let i=this.multiBalls.length-1;i>=0;i--){if(this._checkBall(this.multiBalls[i]))this.multiBalls.splice(i,1);}
  }
  _ballCollision(a,b){
    const dx=b.x-a.x,dy=b.y-a.y,dist=Math.sqrt(dx*dx+dy*dy),min=(a.size+b.size)/2;
    if(dist<min&&dist>0){
      const nx=dx/dist,ny=dy/dist,overlap=(min-dist)/2;
      a.x-=nx*overlap;a.y-=ny*overlap;b.x+=nx*overlap;b.y+=ny*overlap;
      const rv=a.dx*nx+a.dy*ny-b.dx*nx-b.dy*ny;
      if(rv>0){a.dx-=rv*nx;a.dy-=rv*ny;b.dx+=rv*nx;b.dy+=rv*ny;}
    }
  }
  _checkBall(b){
    const bw=b.size/2;
    // wall bounces
    if(b.y-bw<=0){b.y=bw;b.dy=Math.abs(b.dy);if(settings.soundEnabled)this.sound.play('wall');}
    if(b.y+bw>=CONFIG.canvasHeight){b.y=CONFIG.canvasHeight-bw;b.dy=-Math.abs(b.dy);if(settings.soundEnabled)this.sound.play('wall');}
    // left paddle
    if(b.dx<0&&b.x-bw<=this.paddleLeft.x+this.paddleLeft.width&&b.x-bw>=this.paddleLeft.x){
      const ly=this.paddleLeft.y-(this.puEffects.lBig>0?this.paddleLeft.height*.25:0);
      const lh=this.paddleLeft.height+(this.puEffects.lBig>0?this.paddleLeft.height*.5:0);
      if(b.y+bw>=ly&&b.y-bw<=ly+lh)this._hitBall(b,this.paddleLeft,1);
    }
    // right paddle
    if(b.dx>0&&b.x+bw>=this.paddleRight.x&&b.x+bw<=this.paddleRight.x+this.paddleRight.width){
      const ry=this.paddleRight.y-(this.puEffects.rBig>0?this.paddleRight.height*.25:0);
      const rh=this.paddleRight.height+(this.puEffects.rBig>0?this.paddleRight.height*.5:0);
      if(b.y+bw>=ry&&b.y-bw<=ry+rh)this._hitBall(b,this.paddleRight,-1);
    }
    // goals
    if(b.x+bw<0){
      if(this.puEffects.lShield>0){this.puEffects.lShield--;this._shieldBreak('left');b.dx=Math.abs(b.dx);b.x=bw;if(settings.soundEnabled)this.sound.play('paddle');}
      else{this._score('right',b.x,b.y,b.color);return true;}
    }
    if(b.x-bw>CONFIG.canvasWidth){
      if(this.puEffects.rShield>0){this.puEffects.rShield--;this._shieldBreak('right');b.dx=-Math.abs(b.dx);b.x=CONFIG.canvasWidth-bw;if(settings.soundEnabled)this.sound.play('paddle');}
      else{this._score('left',b.x,b.y,b.color);return true;}
    }
    return false;
  }
  _hitBall(b,paddle,dir){
    const hp=(b.y-paddle.y)/paddle.height,cl=Math.max(.05,Math.min(.95,hp)),ang=(cl-.5)*(Math.PI/3);
    b.speed=Math.min(b.speed+CONFIG.ballSpeedIncrement,CONFIG.ballSpeedMax)*this.ballSpeedMod;
    b.dx=Math.cos(ang)*b.speed*dir;b.dy=Math.sin(ang)*b.speed;
    b.x=paddle.x+(dir>0?paddle.width+b.size/2:-b.size/2);
    this.lastHitBy=dir>0?'left':'right';
    b.spin=(cl-.5)*b.speed*.12;
    if(settings.soundEnabled)this.sound.play('paddle');
  }
  _score(side,bx,by,color){
    if(side==='right'){this.paddleRight.score+=this.puEffects.dpRight?2:1;this.puEffects.dpRight=false;}
    else{this.paddleLeft.score+=this.puEffects.dpLeft?2:1;this.puEffects.dpLeft=false;}
    if(settings.effectsEnabled&&bx!==undefined){for(let i=0;i<20;i++)this.particles.push(new Particle(bx,by,color||this.ball.color));}
    this.serveDirection=Math.random()<.5?1:-1;
    if(this.multiBalls.length===0)this.transition('goal');
  }
  _updateGoal(){if(++this.serveTimer>90)this.transition('serving');}
  _updateOver(){if(this.input.isDown(' '))this.restart();}
  _handleInput(){
    this.paddleLeft.vy=0;if(!this.ai)this.paddleRight.vy=0;
    const lSpd=CONFIG.paddleSpeed*(this.puEffects.lSlow>0?.4:1);
    const rSpd=CONFIG.paddleSpeed*(this.puEffects.rSlow>0?.4:1);
    if(this.input.isDown('w')||this.input.isDown('W'))this.paddleLeft.vy=-lSpd;
    if(this.input.isDown('s')||this.input.isDown('S'))this.paddleLeft.vy=lSpd;
    if(!this.ai){if(this.input.isDown('ArrowUp'))this.paddleRight.vy=-rSpd;if(this.input.isDown('ArrowDown'))this.paddleRight.vy=rSpd;}
  }

  /* ---- power-ups ---- */
  _updatePowerUps(){
    if(!this.powerUp){
      if(--this.puSpawnTimer<=0)this._spawnPowerUp();
    }else{
      const pu=this.powerUp;
      const checkBall=(b)=>{const dx=b.x-pu.x,dy=b.y-pu.y;return Math.sqrt(dx*dx+dy*dy)<b.size/2+10;};
      if(checkBall(this.ball)||this.multiBalls.some(checkBall)){
        this._applyPowerUp(this.powerUp.type);
        this.powerUp=null;this.puSpawnTimer=300+Math.random()*600;
      }
    }
  }
  _spawnPowerUp(){
    const t=POWERUP_TYPES[Math.floor(Math.random()*POWERUP_TYPES.length)];
    const m=t.id==='x3'?250:100; // x3 spawns more centrally for reaction time
    this.powerUp={x:m+Math.random()*(CONFIG.canvasWidth-m*2),y:m+Math.random()*(CONFIG.canvasHeight-m*2),type:t};
  }
  _applyPowerUp(type){
    const p=this.lastHitBy||'left',o=p==='left'?'right':'left';
    switch(type.id){
      case'bigPaddle':if(p==='left')this.puEffects.lBig=type.dur;else this.puEffects.rBig=type.dur;break;
      case'shield':if(p==='left')this.puEffects.lShield++;else this.puEffects.rShield++;break;
      case'speedUp':this.puEffects.ballSpd=type.dur;break;
      case'slowOpp':if(o==='left')this.puEffects.lSlow=type.dur;else this.puEffects.rSlow=type.dur;break;
      case'dp':if(p==='left')this.puEffects.dpLeft=true;else this.puEffects.dpRight=true;break;
      case'x3':this._activateMultiBall();break;
    }
  }
  _activateMultiBall(){
    const a=this.ball,b1=new Ball(a.x,a.y,a.size,a.color);
    b1.skin=a.skin;const ang=Math.atan2(a.dy,a.dx),sp=a.speed;
    b1.dx=Math.cos(ang+.5)*sp;b1.dy=Math.sin(ang+.5)*sp;b1.angle=a.angle;b1.spin=a.spin;
    const b2=new Ball(a.x,a.y,a.size,a.color);
    b2.skin=a.skin;b2.dx=Math.cos(ang-.5)*sp;b2.dy=Math.sin(ang-.5)*sp;b2.angle=a.angle;b2.spin=a.spin;
    a.dx=Math.cos(ang)*sp;a.dy=Math.sin(ang)*sp;
    this.multiBalls.push(b1,b2);
  }
  _updateEffects(){
    const e=this.puEffects;
    if(e.lBig>0)e.lBig--;if(e.rBig>0)e.rBig--;
    if(e.lSlow>0)e.lSlow--;if(e.rSlow>0)e.rSlow--;
    if(e.ballSpd>0){e.ballSpd--;this.ballSpeedMod=1.4;if(e.ballSpd<=0)this.ballSpeedMod=1;}
  }
  _shieldBreak(side){
    const x=side==='left'?4:CONFIG.canvasWidth-4;
    for(let i=0;i<12;i++){
      this.particles.push(new Particle(x,Math.random()*CONFIG.canvasHeight,'#ffaa00'));
    }
  }

  /* ---- drawing ---- */
  _draw(ts){
    if(!this.active)return;
    const ctx=this.ctx,w=CONFIG.canvasWidth,h=CONFIG.canvasHeight,theme=this.getTheme();
    const alpha=(this.state==='playing'&&!this.paused)?Math.min(this.accumulator/this.tickRate,1):1;
    ctx.fillStyle=settings.themeOverrideBg||theme.bg;ctx.fillRect(0,0,w,h);
    ctx.strokeStyle=theme.centerLine;ctx.lineWidth=2;
    switch(theme.lineStyle){case'dashed':ctx.setLineDash([8,12]);break;case'dotted':ctx.setLineDash([3,8]);break;default:ctx.setLineDash([]);}
    ctx.beginPath();ctx.moveTo(w/2,0);ctx.lineTo(w/2,h);ctx.stroke();ctx.setLineDash([]);
    this.paddleLeft.drawInterpolated(ctx,this.getLeftPaddleStyle(),alpha);
    this.paddleRight.drawInterpolated(ctx,this.getRightPaddleStyle(),alpha);
    // big paddle overlay — draw expanded paddle
    if(this.puEffects.lBig>0){
      const iy=this.paddleLeft.prevY+(this.paddleLeft.y-this.paddleLeft.prevY)*alpha;
      const ex=this.paddleLeft.height*.25;
      PaddleRenderer.draw(ctx,this.paddleLeft.x,iy-ex,this.paddleLeft.width,this.paddleLeft.height+ex*2,this.paddleLeft.color,this.getLeftPaddleStyle());
    }
    if(this.puEffects.rBig>0){
      const iy=this.paddleRight.prevY+(this.paddleRight.y-this.paddleRight.prevY)*alpha;
      const ex=this.paddleRight.height*.25;
      PaddleRenderer.draw(ctx,this.paddleRight.x,iy-ex,this.paddleRight.width,this.paddleRight.height+ex*2,this.paddleRight.color,this.getRightPaddleStyle());
    }
    this.ball.drawInterpolated(ctx,ts,alpha);
    for(const b of this.multiBalls)b.drawInterpolated(ctx,ts,alpha);
    for(const p of this.particles)p.draw(ctx,alpha);
    // power-up orb
    if(this.powerUp&&this.state==='playing'){
      const pu=this.powerUp,pulse=.8+Math.sin(Date.now()/300)*.2;
      const g=ctx.createRadialGradient(pu.x,pu.y,4,pu.x,pu.y,14*pulse);
      g.addColorStop(0,colorWithAlpha(pu.type.color,.9));g.addColorStop(1,colorWithAlpha(pu.type.color,0));
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(pu.x,pu.y,14*pulse,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=pu.type.color;ctx.beginPath();ctx.arc(pu.x,pu.y,6,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#fff';ctx.font='bold 8px "Press Start 2P",monospace';
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(pu.type.label,pu.x,pu.y+1);
    }
    // shield barriers — faint glowing line at goal line, stacks = brighter
    if(this.puEffects.lShield>0){
      const a=Math.min(1,this.puEffects.lShield*.35);
      ctx.strokeStyle=colorWithAlpha('#ffaa00',a);ctx.lineWidth=2+this.puEffects.lShield;
      ctx.beginPath();ctx.moveTo(3,0);ctx.lineTo(3,CONFIG.canvasHeight);ctx.stroke();
    }
    if(this.puEffects.rShield>0){
      const a=Math.min(1,this.puEffects.rShield*.35);
      ctx.strokeStyle=colorWithAlpha('#ffaa00',a);ctx.lineWidth=2+this.puEffects.rShield;
      ctx.beginPath();ctx.moveTo(CONFIG.canvasWidth-3,0);ctx.lineTo(CONFIG.canvasWidth-3,CONFIG.canvasHeight);ctx.stroke();
    }
    this._drawOverlay(ctx,w,h,theme);
    if(!this.scoreLeftEl.parentElement.classList.contains('hidden')){
      this.scoreLeftEl.textContent=this.paddleLeft.score;this.scoreRightEl.textContent=this.paddleRight.score;
    }
  }
  _drawOverlay(ctx,w,h,theme){
    ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
    if(this.state==='idle'){
      ctx.font='16px "Press Start 2P",monospace';ctx.fillStyle=theme.text;ctx.fillText('PONG',w/2,h/2-40);
      ctx.font='10px "Press Start 2P",monospace';ctx.globalAlpha=.5+Math.sin(Date.now()/500)*.3;
      ctx.fillText('PRESS SPACE TO START',w/2,h/2+10);ctx.globalAlpha=.4;ctx.fillText('FIRST TO 11 / WIN BY 2',w/2,h/2+30);
    }
    if(this.state==='serving'){ctx.font='10px "Press Start 2P",monospace';ctx.globalAlpha=.6;ctx.fillStyle=theme.text;ctx.fillText('GET READY...',w/2,h/2-20);}
    if(this.state==='goal'){ctx.font='10px "Press Start 2P",monospace';ctx.globalAlpha=.7;ctx.fillStyle=theme.text;ctx.fillText('POINT \u2014 PLAYER '+(this.serveDirection===1?'LEFT':'RIGHT'),w/2,h/2-20);}
    if(this.state==='over'){
      ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(0,0,w,h);ctx.globalAlpha=1;
      ctx.font='18px "Press Start 2P",monospace';ctx.fillStyle=theme.text;ctx.fillText('GAME OVER',w/2,h/2-20);
      ctx.font='12px "Press Start 2P",monospace';ctx.fillText(this.winMessage,w/2,h/2+16);
      ctx.font='10px "Press Start 2P",monospace';ctx.globalAlpha=.5+Math.sin(Date.now()/400)*.3;ctx.fillText('PRESS SPACE TO RESTART',w/2,h/2+48);
    }
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ */
/*  MENU CONTROLLER                                                    */
/* ------------------------------------------------------------------ */

class MenuController {
  constructor(game){
    this.game=game;
    this.menuOverlay=document.getElementById('menuOverlay');this.menuMain=document.getElementById('menuMain');
    this.menuSkins=document.getElementById('menuSkins');
    this.menuTheme=document.getElementById('menuTheme');this.menuPaddle=document.getElementById('menuPaddle');
    this.menuBall=document.getElementById('menuBall');
    this.menuBallEditor=document.getElementById('menuBallEditor');
    this.menuBallPaint=document.getElementById('menuBallPaint');
    this._editor={editingId:null,pendingSrc:null};
    this.paintEditor=null;
    this.pauseOverlay=document.getElementById('pauseOverlay');
    this.scoreboard=document.getElementById('scoreboard');this.canvas=document.getElementById('gameCanvas');
    this.controlsBar=document.getElementById('controlsBar');this.themeSwitcher=document.getElementById('themeSwitcher');
    this._buildThemePresets();this._buildPaddleStyleButtons();this._buildBallSkinButtons();this._buildThemeDots();
    this._bindClicks();this._bindSliders();this._bindColorPickers();this._bindBallEditor();this._syncUI();
  }

  showMainMenu(){
    this.game.state='idle';this.game.active=false;this.game.paused=false;
    this.menuOverlay.classList.remove('hidden');this.menuMain.classList.remove('hidden');
    [this.menuSkins,this.menuTheme,this.menuPaddle,this.menuBall,this.menuBallEditor,this.menuBallPaint].forEach(m=>m.classList.add('hidden'));
    this.pauseOverlay.classList.add('hidden');this.scoreboard.classList.add('hidden');
    this.themeSwitcher.classList.add('hidden');this.controlsBar.classList.remove('hidden');this._syncUI();
  }
  startGame(){
    this.menuOverlay.classList.add('hidden');this.pauseOverlay.classList.add('hidden');
    this.scoreboard.classList.remove('hidden');this.themeSwitcher.classList.remove('hidden');
    this.controlsBar.classList.remove('hidden');
    this._updateControlsBar();this._highlightThemeDots();this.game.sound.init();this.game.start();
  }
  pauseGame(){this.game.paused=true;this.pauseOverlay.classList.remove('hidden');}
  resumeGame(){this.game.paused=false;this.pauseOverlay.classList.add('hidden');}
  backToMenu(){this.game.paused=false;this.showMainMenu();}

  _buildThemePresets(){
    const c=document.getElementById('themePresets');c.innerHTML='';
    for(const name of Object.keys(THEMES)){
      const b=document.createElement('button');b.className='theme-opt';b.dataset.theme=name;b.textContent=name.toUpperCase();
      b.addEventListener('click',()=>this._onPresetClick(name));c.appendChild(b);
    }
  }
  _buildPaddleStyleButtons(){
    for(const side of['left','right']){
      const c=document.getElementById(side+'PaddleStyles');c.innerHTML='';
      for(const{key,label}of PADDLE_STYLES){
        const b=document.createElement('button');b.className='style-btn';b.dataset.skin=key;b.dataset.side=side;b.textContent=label;
        b.addEventListener('click',()=>this._onPaddleStyleClick(side,key));c.appendChild(b);
      }
    }
  }
  _buildBallSkinButtons(){
    const g=document.getElementById('ballSkinGrid');g.innerHTML='';
    for(const{key,label}of BALL_SKINS){
      if(CustomBallRegistry.isHidden(key))continue;   // skip hidden built-ins
      const b=document.createElement('button');b.className='ball-skin-btn';b.dataset.skin=key;b.textContent=label;
      b.addEventListener('click',()=>this._onBallSkinClick(key));g.appendChild(b);
    }
    // custom balls
    for(const cb of CustomBallRegistry.list()){
      const b=document.createElement('button');b.className='ball-skin-btn';b.dataset.skin=cb.id;b.textContent=cb.name;
      b.addEventListener('click',()=>this._onBallSkinClick(cb.id));g.appendChild(b);
    }
  }
  _buildThemeDots(){
    const c=document.getElementById('tsDots');c.innerHTML='';
    for(const[name,theme]of Object.entries(THEMES)){
      const d=document.createElement('span');d.className='theme-dot';d.dataset.theme=name;d.dataset.tooltip=name.toUpperCase();
      d.style.backgroundColor=theme.ball;d.addEventListener('click',()=>{this.game.switchTheme(name);this._highlightThemeDots();this._syncThemePage();});c.appendChild(d);
    }
  }
  _highlightThemeDots(){document.querySelectorAll('.theme-dot').forEach(d=>d.classList.toggle('active',d.dataset.theme===settings.theme));}

  _bindClicks(){
    document.querySelectorAll('.menu-btn').forEach(b=>{b.addEventListener('click',e=>{const a=e.currentTarget.dataset.action;if(a)this._onAction(a);});});
  }
  _onAction(a){
    switch(a){
      case'play':this.startGame();break;
      case'toggle-gamemode':
        settings.gameVariant=settings.gameVariant==='classic'?'powerups':settings.gameVariant==='powerups'?'frenzy':'classic';
        document.getElementById('gameModeLabel').textContent=settings.gameVariant==='classic'?'CLASSIC':settings.gameVariant==='frenzy'?'FRENZY':'POWER UPS';break;
      case'cycle-mode':{
        if(settings.gameMode==='pvp'){settings.gameMode='ai';settings.difficulty='easy';}
        else if(settings.difficulty==='easy')settings.difficulty='medium';
        else if(settings.difficulty==='medium')settings.difficulty='hard';
        else{settings.gameMode='pvp';}
        this._syncUI();this._updateControlsBar();break;
      }
      case'skins':this._showSub(this.menuSkins);break;
      case'theme-page':this._showSub(this.menuTheme);this._syncThemePage();break;
      case'paddle-page':this._showSub(this.menuPaddle);this._syncPaddlePage();break;
      case'ball-page':this._showSub(this.menuBall);this._syncBallPage();break;
      case'back':this._showSub(this.menuMain);this._syncUI();break;
      case'sound':settings.soundEnabled=!settings.soundEnabled;this._syncUI();break;
      case'effects':settings.effectsEnabled=!settings.effectsEnabled;this._syncUI();break;
      case'reset-paddle-left':settings.customPaddleLeft=null;document.getElementById('paddleLeftColor').value=THEMES[settings.theme].paddleLeft;this.game._applyThemeAndColors();this._syncPaddlePage();break;
      case'reset-paddle-right':settings.customPaddleRight=null;document.getElementById('paddleRightColor').value=THEMES[settings.theme].paddleRight;this.game._applyThemeAndColors();this._syncPaddlePage();break;
      case'reset-paddle-width':settings.paddleWidth=14;document.getElementById('paddleWidthSlider').value=14;document.getElementById('paddleWidthVal').textContent=14;this.game._syncDimensions();break;
      case'reset-paddle-height':settings.paddleHeight=90;document.getElementById('paddleHeightSlider').value=90;document.getElementById('paddleHeightVal').textContent=90;this.game._syncDimensions();break;
      case'reset-ball':settings.customBall=null;document.getElementById('ballColor').value=THEMES[settings.theme].ball;this.game._applyThemeAndColors();this._syncBallPage();break;
      case'reset-ball-size':settings.ballSize=16;document.getElementById('ballSizeSlider').value=16;document.getElementById('ballSizeVal').textContent=16;this.game.ball.size=16;break;
      case'reset-theme-bg':settings.themeOverrideBg=null;document.getElementById('themeBg').value=THEMES[settings.theme].bg;applyThemeCSS(settings.theme);this._syncThemePage();break;
      case'reset-theme-accent':settings.themeOverrideAccent=null;document.getElementById('themeAccent').value=THEMES[settings.theme].text;applyThemeCSS(settings.theme);this._syncThemePage();break;
      case'reset-theme-glow':settings.themeOverrideGlow=null;document.getElementById('glowSlider').value=THEMES[settings.theme].glowDefault;document.getElementById('glowVal').textContent=THEMES[settings.theme].glowDefault;applyThemeCSS(settings.theme);this._syncThemePage();break;
      case'resume':this.resumeGame();break;
      case'restart':this.pauseOverlay.classList.add('hidden');this.game.restart();break;
      case'quit':this.backToMenu();break;
      // --- ball texture editor ---
      case'ball-editor':this._openBallEditor();break;
      case'ball-add-new':this._ballEditorShowForm('add');break;
      case'ball-save':this._ballEditorSave();break;
      case'ball-cancel':this._ballEditorHideForm();break;
      case'back-to-ball':this._showSub(this.menuBall);this._syncBallPage();break;
      // --- paint editor ---
      case'ball-draw-new':this._openPaintEditor(null);break;
      case'paint-undo':this.paintEditor&&this.paintEditor.undo();break;
      case'paint-clear':this.paintEditor&&this.paintEditor.clear();break;
      case'paint-load':this._togglePaintLoadGrid();break;
      case'paint-save':this._paintEditorSave();break;
      case'paint-cancel':this._openBallEditor();break;
    }
  }

  _onPresetClick(name){this.game.switchTheme(name);this._highlightThemeDots();this._syncThemePage();this._syncPaddlePage();this._syncBallPage();}
  _onPaddleStyleClick(side,key){if(side==='left')settings.leftPaddleStyle=(key===this.game.getTheme().paddleStyle?null:key);else settings.rightPaddleStyle=(key===this.game.getTheme().paddleStyle?null:key);this._syncPaddlePage();}
  _onBallSkinClick(key){settings.ballSkin=key;this.game.ball.skin=key;this._syncBallPage();}

  _bindSliders(){
    document.getElementById('glowSlider').addEventListener('input',e=>{settings.themeOverrideGlow=parseInt(e.target.value);document.getElementById('glowVal').textContent=e.target.value;applyThemeCSS(settings.theme);});
    document.getElementById('paddleWidthSlider').addEventListener('input',e=>{settings.paddleWidth=parseInt(e.target.value);document.getElementById('paddleWidthVal').textContent=e.target.value;this.game._syncDimensions();});
    document.getElementById('paddleHeightSlider').addEventListener('input',e=>{settings.paddleHeight=parseInt(e.target.value);document.getElementById('paddleHeightVal').textContent=e.target.value;this.game._syncDimensions();});
    document.getElementById('ballSizeSlider').addEventListener('input',e=>{settings.ballSize=parseInt(e.target.value);document.getElementById('ballSizeVal').textContent=e.target.value;this.game.ball.size=settings.ballSize;this._renderBallPreview();});
  }

  _bindColorPickers(){
    document.getElementById('themeBg').addEventListener('input',e=>{settings.themeOverrideBg=e.target.value;applyThemeCSS(settings.theme);});
    document.getElementById('themeAccent').addEventListener('input',e=>{settings.themeOverrideAccent=e.target.value;applyThemeCSS(settings.theme);});
    document.getElementById('paddleLeftColor').addEventListener('input',e=>{settings.customPaddleLeft=e.target.value;this.game._applyThemeAndColors();});
    document.getElementById('paddleRightColor').addEventListener('input',e=>{settings.customPaddleRight=e.target.value;this.game._applyThemeAndColors();});
    document.getElementById('ballColor').addEventListener('input',e=>{settings.customBall=e.target.value;this.game._applyThemeAndColors();this._renderBallPreview();});
  }

  _syncThemePage(){
    const t=THEMES[settings.theme];
    document.querySelectorAll('#themePresets .theme-opt').forEach(b=>b.classList.toggle('active',b.dataset.theme===settings.theme));
    document.getElementById('themeBg').value=settings.themeOverrideBg||t.bg;
    document.getElementById('themeAccent').value=settings.themeOverrideAccent||t.text;
    const gv=settings.themeOverrideGlow!==null?settings.themeOverrideGlow:t.glowDefault;
    document.getElementById('glowSlider').value=gv;document.getElementById('glowVal').textContent=gv;
  }
  _syncPaddlePage(){
    const t=this.game.getTheme(),ls=settings.leftPaddleStyle||t.paddleStyle,rs=settings.rightPaddleStyle||t.paddleStyle;
    document.querySelectorAll('#leftPaddleStyles .style-btn').forEach(b=>b.classList.toggle('active',b.dataset.skin===ls));
    document.querySelectorAll('#rightPaddleStyles .style-btn').forEach(b=>b.classList.toggle('active',b.dataset.skin===rs));
    document.getElementById('paddleLeftColor').value=settings.customPaddleLeft||t.paddleLeft;
    document.getElementById('paddleRightColor').value=settings.customPaddleRight||t.paddleRight;
    document.getElementById('paddleWidthSlider').value=settings.paddleWidth;document.getElementById('paddleWidthVal').textContent=settings.paddleWidth;
    document.getElementById('paddleHeightSlider').value=settings.paddleHeight;document.getElementById('paddleHeightVal').textContent=settings.paddleHeight;
  }
  _syncBallPage(){
    this._buildBallSkinButtons(); // refresh to include new/removed custom balls
    const t=this.game.getTheme();
    document.querySelectorAll('#ballSkinGrid .ball-skin-btn').forEach(b=>b.classList.toggle('active',b.dataset.skin===settings.ballSkin));
    document.getElementById('ballColor').value=settings.customBall||t.ball;
    document.getElementById('ballSizeSlider').value=settings.ballSize;document.getElementById('ballSizeVal').textContent=settings.ballSize;
    this._renderBallPreview();
  }
  _renderBallPreview(){
    const cv=document.getElementById('ballPreview');
    if(!cv||cv.classList.contains('hidden'))return;
    const ctx=cv.getContext('2d'),s=cv.width;
    ctx.clearRect(0,0,s,s);
    const t=this.game.getTheme(),c=settings.customBall||t.ball;
    BallRenderer.draw(ctx,s/2,s/2,settings.ballSize*1.6,c,settings.ballSkin,Date.now());
  }

  /* ---- ball paint editor ---- */

  _openPaintEditor(target){
    // lazy-init editor + pointer bindings once
    if(!this.paintEditor){
      this.paintEditor=createBallPaintEditor();
      const cv=this.paintEditor.canvas;
      cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);this.paintEditor.onPointerDown(e.clientX,e.clientY);});
      cv.addEventListener('pointermove',e=>this.paintEditor.onPointerMove(e.clientX,e.clientY));
      cv.addEventListener('pointerup',e=>this.paintEditor.onPointerUp(e.clientX,e.clientY));
      cv.addEventListener('pointerleave',e=>this.paintEditor.onPointerUp(e.clientX,e.clientY));
    }
    document.getElementById('paintLoadGrid').classList.add('hidden');
    const nameField=document.getElementById('paintName');

    // determine mode from target
    let mode='new';
    if(typeof target==='string'){
      mode=CustomBallRegistry.isCustom(target)?'custom':'builtin';
    }
    this._paintMode=mode;
    this._paintEditingId=(mode==='custom')?target:null;
    this._paintBuiltinKey=(mode==='builtin')?target:null;

    if(mode==='custom'){
      const b=CustomBallRegistry.get(target);
      nameField.disabled=false;
      nameField.value=b?b.name:'';
      if(b)this._paintLoadSrc(b.src);else this.paintEditor.clear();
    }else if(mode==='builtin'){
      const lbl=(BALL_SKINS.find(s=>s.key===target)||{}).label||target;
      nameField.value=lbl;nameField.disabled=true;   // built-in keeps its name
      const ov=CustomBallRegistry.getOverride(target);
      if(ov)this._paintLoadSrc(ov.src);        // continue editing existing override
      else this.paintEditor.loadBall(target);  // start from the procedural ball
    }else{
      nameField.disabled=false;nameField.value='';
      this.paintEditor.clear();
    }
    this._showSub(this.menuBallPaint);
  }

  /** Load an image data URL onto the paint canvas */
  _paintLoadSrc(src){
    const img=new Image();
    img.onload=()=>{
      const pc=this.paintEditor.canvas,pctx=pc.getContext('2d');
      pctx.clearRect(0,0,pc.width,pc.height);
      pctx.drawImage(img,0,0,pc.width,pc.height);
      this.paintEditor.resetUndo();
    };
    img.src=src;
  }

  _togglePaintLoadGrid(){
    const g=document.getElementById('paintLoadGrid');
    if(g.classList.contains('hidden')){
      this.paintEditor.buildLoadGrid();
      g.classList.remove('hidden');
    }else{
      g.classList.add('hidden');
    }
  }

  _paintEditorSave(){
    const src=this.paintEditor.getDataURL();
    if(this._paintMode==='builtin'){
      CustomBallRegistry.setOverride(this._paintBuiltinKey,src,false);
    }else if(this._paintMode==='custom'){
      const name=document.getElementById('paintName').value.trim();
      if(!name){alert('ENTER A NAME');return;}
      CustomBallRegistry.update(this._paintEditingId,name,src,false);
    }else{
      const name=document.getElementById('paintName').value.trim();
      if(!name){alert('ENTER A NAME');return;}
      CustomBallRegistry.add(name,src,false);
    }
    this._buildBallSkinButtons();
    this._openBallEditor();
  }

  /* ---- ball texture editor ---- */

  _bindBallEditor(){
    const fi=document.getElementById('editorFile');
    fi.addEventListener('change',()=>{
      const file=fi.files[0];
      if(!file)return;
      document.getElementById('editorFileName').textContent=file.name;
      const reader=new FileReader();
      reader.onload=()=>{
        this._editor.pendingSrc=reader.result;
        this._renderEditorPreview(reader.result);
      };
      reader.readAsDataURL(file);
    });
  }

  _openBallEditor(){
    this._editor={pendingSrc:null,editingId:null};
    this._renderBallEditorList();
    this._ballEditorHideForm(false);
    this._showSub(this.menuBallEditor);
  }

  _renderBallEditorList(){
    const el=document.getElementById('customBallList');
    el.innerHTML='';

    // helper: make a row
    const makeRow=(key,label,isBuiltin)=>{
      const row=document.createElement('div');row.className='custom-ball-row';
      const thumb=document.createElement('canvas');thumb.width=32;thumb.height=32;thumb.className='cb-thumb';
      this._renderThumb(thumb,key);
      const name=document.createElement('span');name.className='cb-name';name.textContent=label;
      row.appendChild(thumb);row.appendChild(name);

      const editBtn=document.createElement('button');editBtn.className='menu-btn tiny';editBtn.textContent='EDIT';
      editBtn.addEventListener('click',()=>this._openPaintEditor(key));
      row.appendChild(editBtn);

      if(isBuiltin){
        // RESET (only if overridden)
        if(CustomBallRegistry.getOverride(key)){
          const resetBtn=document.createElement('button');resetBtn.className='menu-btn tiny';resetBtn.textContent='RESET';
          resetBtn.addEventListener('click',()=>{CustomBallRegistry.removeOverride(key);this._refreshAfterBallChange();});
          row.appendChild(resetBtn);
        }
        // HIDE / SHOW toggle
        const hidden=CustomBallRegistry.isHidden(key);
        const hideBtn=document.createElement('button');hideBtn.className='menu-btn tiny';hideBtn.textContent=hidden?'SHOW':'DEL';
        if(hidden)row.style.opacity='0.5';
        hideBtn.addEventListener('click',()=>{
          if(hidden)CustomBallRegistry.unhide(key);else CustomBallRegistry.hide(key);
          this._refreshAfterBallChange();
        });
        row.appendChild(hideBtn);
      }else{
        const delBtn=document.createElement('button');delBtn.className='menu-btn tiny';delBtn.textContent='DEL';
        delBtn.addEventListener('click',()=>this._ballEditorDelete(key));
        row.appendChild(delBtn);
      }
      return row;
    };

    // section: built-in balls
    const hdr1=document.createElement('p');hdr1.className='menu-label';hdr1.textContent='BUILT-IN';
    el.appendChild(hdr1);
    for(const s of BALL_SKINS)el.appendChild(makeRow(s.key,s.label,true));

    // section: custom balls
    const customs=CustomBallRegistry.list();
    const hdr2=document.createElement('p');hdr2.className='menu-label';hdr2.textContent='CUSTOM';
    el.appendChild(hdr2);
    if(customs.length===0){
      const empty=document.createElement('div');empty.className='custom-ball-empty';empty.textContent='NONE YET';
      el.appendChild(empty);
    }else{
      for(const b of customs)el.appendChild(makeRow(b.id,b.name,false));
    }
  }

  /** Draw a ball thumbnail on a small canvas, redrawing when async images load */
  _renderThumb(cv,key){
    const ctx=cv.getContext('2d'),s=cv.width;
    const paint=()=>{ctx.clearRect(0,0,s,s);BallRenderer.draw(ctx,s/2,s/2,s-2,'#ffffff',key,0);};
    paint();
    let img=null;
    if(CustomBallRegistry.isCustom(key))img=CustomBallRegistry.image(key);
    else if(CustomBallRegistry.getOverride(key))img=CustomBallRegistry.overrideImage(key);
    if(img&&!img.complete)img.addEventListener('load',paint,{once:true});
  }

  /** Refresh editor list + main grid after any ball change */
  _refreshAfterBallChange(){
    this._renderBallEditorList();
    this._buildBallSkinButtons();
  }

  _ballEditorShowForm(mode,ballId){
    this._editor.editingId=mode==='edit'?ballId:null;
    const f=document.getElementById('ballEditorForm');
    f.classList.remove('hidden');
    document.getElementById('editorName').value='';
    document.getElementById('editorFileName').textContent='no file';
    document.getElementById('editorFile').value='';
    document.getElementById('editorShading').checked=false;
    this._editor.pendingSrc=null;
    const pv=document.getElementById('editorPreview');
    pv.getContext('2d').clearRect(0,0,pv.width,pv.height);

    if(mode==='edit'&&ballId){
      const b=CustomBallRegistry.get(ballId);
      if(b){
        document.getElementById('editorName').value=b.name;
        this._editor.pendingSrc=b.src;
        document.getElementById('editorFileName').textContent='(current)';
        if(b.shading)document.getElementById('editorShading').checked=true;
        this._renderEditorPreview(b.src);
      }
    }
  }

  _ballEditorHideForm(clearEditor=true){
    document.getElementById('ballEditorForm').classList.add('hidden');
    if(clearEditor)this._editor={pendingSrc:null,editingId:null};
  }

  _ballEditorSave(){
    const name=document.getElementById('editorName').value.trim();
    if(!name){alert('ENTER A NAME');return;}
    const src=this._editor.pendingSrc;
    if(!src){alert('CHOOSE AN IMAGE');return;}
    const shading=document.getElementById('editorShading').checked;

    if(this._editor.editingId){
      CustomBallRegistry.update(this._editor.editingId,name,src,shading);
    }else{
      CustomBallRegistry.add(name,src,shading);
    }
    this._renderBallEditorList();
    this._ballEditorHideForm(true);
  }

  _ballEditorDelete(id){
    if(!confirm('DELETE THIS TEXTURE?'))return;
    CustomBallRegistry.remove(id);
    this._refreshAfterBallChange();
  }

  _renderEditorPreview(src){
    const cv=document.getElementById('editorPreview');
    if(!cv||cv.classList.contains('hidden'))return;
    const ctx=cv.getContext('2d'),s=cv.width;
    ctx.clearRect(0,0,s,s);
    const img=new Image();
    img.onload=()=>{
      // draw clipped to circle
      ctx.save();
      ctx.beginPath();ctx.arc(s/2,s/2,s/2,0,Math.PI*2);ctx.clip();
      ctx.drawImage(img,0,0,s,s);
      const shading=document.getElementById('editorShading').checked;
      if(shading){
        const sg=ctx.createRadialGradient(s*.35,s*.33,2,s/2,s/2,s/2);
        sg.addColorStop(0,'rgba(255,255,255,0)');
        sg.addColorStop(.5,'rgba(255,255,255,0)');
        sg.addColorStop(1,'rgba(0,0,0,.35)');
        ctx.fillStyle=sg;ctx.fillRect(0,0,s,s);
      }
      ctx.restore();
    };
    img.src=src;
  }

  _showSub(active){[this.menuMain,this.menuSkins,this.menuTheme,this.menuPaddle,this.menuBall,this.menuBallEditor,this.menuBallPaint].forEach(m=>m.classList.add('hidden'));active.classList.remove('hidden');}
  _syncUI(){
    document.getElementById('modeLabel').textContent=settings.gameMode==='ai'?'PLAYER vs AI ('+settings.difficulty.toUpperCase()+')':'PLAYER vs PLAYER';
    document.getElementById('gameModeLabel').textContent=settings.gameVariant==='classic'?'CLASSIC':settings.gameVariant==='frenzy'?'FRENZY':'POWER UPS';
    const sl=document.getElementById('soundLabel'),sb=sl.parentElement;sl.textContent=settings.soundEnabled?'ON':'OFF';sb.classList.toggle('on',settings.soundEnabled);sb.classList.toggle('off',!settings.soundEnabled);
    const el=document.getElementById('effectsLabel'),eb=el.parentElement;el.textContent=settings.effectsEnabled?'ON':'OFF';eb.classList.toggle('on',settings.effectsEnabled);eb.classList.toggle('off',!settings.effectsEnabled);
  }
  _updateControlsBar(){
    const p2=document.getElementById('p2Controls');
    p2.innerHTML=settings.gameMode==='ai'?'<span class="label">AI</span><span class="ai-badge">'+settings.difficulty.toUpperCase()+'</span>':'<span class="label">Player 2</span><span class="key">&#9650;</span><span class="key">&#9660;</span>';
  }
}

/* ------------------------------------------------------------------ */
/*  BOOTSTRAP                                                          */
/* ------------------------------------------------------------------ */

(function main(){
  const canvas=document.getElementById('gameCanvas'),sl=document.getElementById('scoreLeft'),sr=document.getElementById('scoreRight');
  const game=new PongGame(canvas,sl,sr),menu=new MenuController(game);
  menu.showMainMenu();game._applyThemeAndColors();applyThemeCSS(settings.theme);menu._highlightThemeDots();

  window.addEventListener('keydown',e=>{
    if(e.key!=='Escape')return;
    const t=e.target;if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable)){t.blur();return;}
    if(!menu.menuOverlay.classList.contains('hidden')||!menu.pauseOverlay.classList.contains('hidden')){
      if(!menu.pauseOverlay.classList.contains('hidden'))menu.resumeGame();
      else{const subs=[menu.menuSkins,menu.menuTheme,menu.menuPaddle,menu.menuBall];if(subs.some(m=>!m.classList.contains('hidden')))menu._onAction('back');}
      return;
    }
    if(game.state==='playing'||game.state==='serving'||game.state==='goal'){if(game.paused)menu.resumeGame();else menu.pauseGame();}
    else if(game.state==='over')menu.backToMenu();
  });
})();
