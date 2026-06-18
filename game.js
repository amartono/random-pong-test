/**
 * PONG — HTML5 Canvas Game
 *  - 3 dedicated customization pages: Theme / Paddles / Ball
 *  - Paddle styles per player, dynamic sizing, glow slider, theme overrides
 *  - Frame interpolation, 12 ball skins, 9 themes, AI opponent, sound
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
    uiBg:'#111111',uiTextDim:'#555555',uiMenuBg:'rgba(0,0,0,0.92)',
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
  { key:'circle',label:'CIRCLE' },{ key:'ring',label:'RING' },
  { key:'basketball',label:'B-BALL' },{ key:'soccer',label:'SOCCER' },{ key:'tennis',label:'TENNIS' },
  { key:'planet',label:'PLANET' },{ key:'moon',label:'MOON' },
  { key:'glow',label:'GLOW' },{ key:'pulse',label:'PULSE' },
];

/* ------------------------------------------------------------------ */
/*  BALL RENDERER (same as before, compressed)                         */
/* ------------------------------------------------------------------ */

const BallRenderer = {
  draw(ctx,x,y,s,c,skin,t){
    const h=s/2;
    switch(skin){
      case'circle':ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,h,0,Math.PI*2);ctx.fill();break;
      case'ring':ctx.strokeStyle=c;ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(x,y,h-1.5,0,Math.PI*2);ctx.stroke();break;
      case'basketball':{
        const b=blendHex(c,'#e87400',.55);ctx.fillStyle=b;ctx.beginPath();ctx.arc(x,y,h,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='#1a1a1a';ctx.lineWidth=1.5;
        ctx.beginPath();ctx.arc(x,y,h,0,Math.PI*2);ctx.stroke();
        ctx.beginPath();ctx.moveTo(x-h,y);ctx.quadraticCurveTo(x,y-h*.5,x+h,y);ctx.stroke();
        ctx.beginPath();ctx.moveTo(x,y-h);ctx.lineTo(x,y+h);ctx.stroke();
        break;
      }
      case'soccer':{
        ctx.fillStyle='#f0f0f0';ctx.beginPath();ctx.arc(x,y,h,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='#1a1a1a';ctx.lineWidth=1.2;
        ctx.beginPath();ctx.arc(x,y,h,0,Math.PI*2);ctx.stroke();
        const pr=h*.38;ctx.fillStyle='#1a1a1a';ctx.beginPath();
        for(let i=0;i<5;i++){const a=Math.PI*2/5*i-Math.PI/2,px=x+Math.cos(a)*pr,py=y+Math.sin(a)*pr;
          if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}
        ctx.closePath();ctx.fill();ctx.stroke();
        for(let i=0;i<5;i++){const a=Math.PI*2/5*i-Math.PI/2;
          ctx.beginPath();ctx.moveTo(x+Math.cos(a)*pr,y+Math.sin(a)*pr);
          ctx.lineTo(x+Math.cos(a)*h,y+Math.sin(a)*h);ctx.stroke();}
        break;
      }
      case'tennis':{const b=blendHex(c,'#ccff00',.5);ctx.fillStyle=b;ctx.beginPath();ctx.arc(x,y,h,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='#fafaf0';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x,y,h*.7,-.6,2.5);ctx.stroke();break;}
      case'planet':{
        ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,h,0,Math.PI*2);ctx.fill();ctx.save();
        ctx.beginPath();ctx.arc(x,y,h,0,Math.PI*2);ctx.clip();
        const land=shiftHue(c,40);ctx.fillStyle=land;
        this._blob(ctx,x-h*.35,y-h*.25,h*.45,h*.30,0);
        this._blob(ctx,x+h*.15,y+h*.15,h*.35,h*.25,1);
        this._blob(ctx,x+h*.20,y-h*.45,h*.30,h*.22,2);
        this._blob(ctx,x-h*.10,y+h*.50,h*.25,h*.18,3);
        ctx.restore();ctx.strokeStyle=darken(c,.2);ctx.lineWidth=.8;
        ctx.beginPath();ctx.arc(x,y,h,0,Math.PI*2);ctx.stroke();break;
      }
      case'moon':{
        const base=darken(c,.3);ctx.fillStyle=base;ctx.beginPath();ctx.arc(x,y,h,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=darken(base,.25);
        const craters=[[-.30,-.20,.18],[.25,.10,.15],[-.05,.35,.13],[.40,-.30,.11],[-.45,.25,.10],[.10,-.40,.09]];
        for(const[dx,dy,rr]of craters){ctx.beginPath();ctx.arc(x+h*dx,y+h*dy,h*rr,0,Math.PI*2);ctx.fill();}
        ctx.strokeStyle=darken(c,.15);ctx.lineWidth=.8;ctx.beginPath();ctx.arc(x,y,h,0,Math.PI*2);ctx.stroke();break;
      }
      case'glow':{
        const p=.7+Math.sin((t||Date.now())/400)*.15;
        const grad=ctx.createRadialGradient(x,y,h*.3,x,y,h*2.2*p);
        grad.addColorStop(0,c);grad.addColorStop(.45,colorWithAlpha(c,.35));grad.addColorStop(1,colorWithAlpha(c,0));
        ctx.fillStyle=grad;ctx.beginPath();ctx.arc(x,y,h*2.2*p,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,h*.55,0,Math.PI*2);ctx.fill();break;
      }
      case'pulse':{
        const sc=.7+Math.sin((t||Date.now())/200)*.3,cr=h*sc;
        ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,cr,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle=lighten(c,.3);ctx.lineWidth=1.2;ctx.globalAlpha=.5;
        ctx.beginPath();ctx.arc(x,y,h*(sc+.15),0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;break;
      }
    }
  },
  _blob(ctx,cx,cy,rx,ry,idx){
    const ang=[.12,-.18,.06,-.09,.22,-.14,.03,.30];
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
    this.x=x;this.y=y;this.prevX=x;this.prevY=y;this.size=s;this.color=color;    this.skin='circle';this.dx=0;this.dy=0;this.speed=CONFIG.ballSpeedInitial;
  }
  reset(cw,ch,dir){
    this.x=cw/2;this.y=ch/2;this.prevX=this.x;this.prevY=this.y;this.speed=CONFIG.ballSpeedInitial;
    const ang=Math.random()*.8-.4;
    this.dx=Math.cos(ang)*this.speed*dir;this.dy=Math.sin(ang)*this.speed;
  }
  update(){this.prevX=this.x;this.prevY=this.y;this.x+=this.dx;this.y+=this.dy;}
  draw(ctx,t){BallRenderer.draw(ctx,this.x,this.y,this.size,this.color,this.skin,t);}
  drawInterpolated(ctx,t,alpha){
    const ix=this.prevX+(this.x-this.prevX)*alpha,iy=this.prevY+(this.y-this.prevY)*alpha;
    BallRenderer.draw(ctx,ix,iy,this.size,this.color,this.skin,t);
  }
}

/* ------------------------------------------------------------------ */
/*  AI OPPONENT                                                        */
/* ------------------------------------------------------------------ */

class AIOpponent {
  constructor(diff){this.difficulty=diff;}
  update(paddle,ball,ch){
    const tY=this._getTargetY(paddle,ball,ch),sp=this._getSpeed();
    const center=paddle.y+paddle.height/2,diff=tY-center;
    if(Math.abs(diff)<sp){paddle.vy=0;paddle.y=tY-paddle.height/2;}
    else if(diff>0)paddle.vy=sp;else paddle.vy=-sp;
  }
  _getTargetY(paddle,ball,ch){
    switch(this.difficulty){case'easy':return this._easy(ball,ch);case'medium':return this._med(ball,ch);case'hard':return this._hard(paddle,ball,ch);default:return ball.y;}
  }
  _getSpeed(){switch(this.difficulty){case'easy':return CONFIG.paddleSpeed*.45;case'medium':return CONFIG.paddleSpeed*.72;case'hard':return CONFIG.paddleSpeed*.95;default:return CONFIG.paddleSpeed*.6;}}
  _easy(ball,ch){if(ball.dx<=0)return ch/2;return ball.y+(Math.random()-.5)*140;}
  _med(ball,ch){if(ball.dx<=0)return ch/2;return ball.y+(Math.random()-.5)*50;}
  _hard(paddle,ball,ch){
    if(ball.dx<=0)return ch/2;
    let bx=ball.x,by=ball.y,bdx=ball.dx,bdy=ball.dy,hb=ball.size/2,tx=paddle.x;
    while(bx<tx){bx+=bdx;by+=bdy;if(by-hb<=0){by=hb;bdy=Math.abs(bdy);}else if(by+hb>=ch){by=ch-hb;bdy=-Math.abs(bdy);}}
    return by;
  }
}

/* ------------------------------------------------------------------ */
/*  INPUT HANDLER                                                      */
/* ------------------------------------------------------------------ */

class InputHandler {
  constructor(){this.keys={};this._onDown=this._onDown.bind(this);this._onUp=this._onUp.bind(this);window.addEventListener('keydown',this._onDown);window.addEventListener('keyup',this._onUp);}
  _onDown(e){this.keys[e.key]=true;if(['ArrowUp','ArrowDown','w','s','W','S',' ','Escape'].includes(e.key))e.preventDefault();}
  _onUp(e){this.keys[e.key]=false;}
  isDown(key){return!!this.keys[key];}
  destroy(){window.removeEventListener('keydown',this._onDown);window.removeEventListener('keyup',this._onUp);}
}

/* ------------------------------------------------------------------ */
/*  SETTINGS                                                           */
/* ------------------------------------------------------------------ */

const settings = {
  gameMode:'pvp',difficulty:'medium',soundEnabled:true,effectsEnabled:true,
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
    this.lastTime=0;this.accumulator=0;this.tickRate=1000/60;
    this._loop=this._loop.bind(this);this.ball.reset(CONFIG.canvasWidth,CONFIG.canvasHeight,0);this._loop(0);
  }

  start(){
    this._applySettings();this.active=true;this.paused=false;
    this.ai=settings.gameMode==='ai'?new AIOpponent(settings.difficulty):null;
    this._syncDimensions();this._resetGame();this.transition('serving');
  }
  restart(){this.paused=false;this._resetGame();this.transition('serving');}
  _applySettings(){this._applyThemeAndColors();this.ball.skin=settings.ballSkin;applyThemeCSS(settings.theme);}
  _applyThemeAndColors(){
    const t=THEMES[settings.theme];
    this.paddleLeft.color=settings.customPaddleLeft||t.paddleLeft;
    this.paddleRight.color=settings.customPaddleRight||t.paddleRight;
    this.ball.color=settings.customBall||t.ball;
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
  }

  transition(newState){
    const prev=this.state;this.state=newState;this.serveTimer=0;
    if(newState==='goal'){
      if(settings.soundEnabled)this.sound.play('score');
      if(settings.effectsEnabled){for(let i=0;i<24;i++)this.particles.push(new Particle(this.ball.x,this.ball.y,this.ball.color));}
      const wr=this._checkWin();if(wr){this.winMessage='PLAYER '+wr+' WINS!';this.state='over';if(settings.soundEnabled)this.sound.play('win');}
    }
    if(newState==='serving'){this.paddleLeft.reset(CONFIG.canvasHeight);this.paddleRight.reset(CONFIG.canvasHeight);this.ball.reset(CONFIG.canvasWidth,CONFIG.canvasHeight,this.serveDirection);}
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
    if(this.ai)this.ai.update(this.paddleRight,this.ball,CONFIG.canvasHeight);
    this.paddleRight.update(CONFIG.canvasHeight);
    this.ball.update();
    const bw=this.ball.size/2;
    if(this.ball.y-bw<=0){this.ball.y=bw;this.ball.dy=Math.abs(this.ball.dy);if(settings.soundEnabled)this.sound.play('wall');}
    if(this.ball.y+bw>=CONFIG.canvasHeight){this.ball.y=CONFIG.canvasHeight-bw;this.ball.dy=-Math.abs(this.ball.dy);if(settings.soundEnabled)this.sound.play('wall');}
    if(this.ball.dx<0&&this.ball.x-bw<=this.paddleLeft.x+this.paddleLeft.width&&this.ball.x-bw>=this.paddleLeft.x&&this.ball.y+bw>=this.paddleLeft.y&&this.ball.y-bw<=this.paddleLeft.y+this.paddleLeft.height)this._hitPaddle(this.paddleLeft,1);
    if(this.ball.dx>0&&this.ball.x+bw>=this.paddleRight.x&&this.ball.x+bw<=this.paddleRight.x+this.paddleRight.width&&this.ball.y+bw>=this.paddleRight.y&&this.ball.y-bw<=this.paddleRight.y+this.paddleRight.height)this._hitPaddle(this.paddleRight,-1);
    if(this.ball.x+bw<0){this.paddleRight.score++;this.serveDirection=Math.random()<.5?1:-1;this.transition('goal');}
    if(this.ball.x-bw>CONFIG.canvasWidth){this.paddleLeft.score++;this.serveDirection=Math.random()<.5?1:-1;this.transition('goal');}
  }
  _hitPaddle(paddle,dir){
    const hp=(this.ball.y-paddle.y)/paddle.height,cl=Math.max(.05,Math.min(.95,hp)),ang=(cl-.5)*(Math.PI/3);
    this.ball.speed=Math.min(this.ball.speed+CONFIG.ballSpeedIncrement,CONFIG.ballSpeedMax);
    this.ball.dx=Math.cos(ang)*this.ball.speed*dir;this.ball.dy=Math.sin(ang)*this.ball.speed;
    this.ball.x=paddle.x+(dir>0?paddle.width+this.ball.size/2:-this.ball.size/2);
    if(settings.soundEnabled)this.sound.play('paddle');
  }
  _updateGoal(){if(++this.serveTimer>90)this.transition('serving');}
  _updateOver(){if(this.input.isDown(' '))this.restart();}
  _handleInput(){
    this.paddleLeft.vy=0;if(!this.ai)this.paddleRight.vy=0;
    if(this.input.isDown('w')||this.input.isDown('W'))this.paddleLeft.vy=-CONFIG.paddleSpeed;
    if(this.input.isDown('s')||this.input.isDown('S'))this.paddleLeft.vy=CONFIG.paddleSpeed;
    if(!this.ai){if(this.input.isDown('ArrowUp'))this.paddleRight.vy=-CONFIG.paddleSpeed;if(this.input.isDown('ArrowDown'))this.paddleRight.vy=CONFIG.paddleSpeed;}
  }

  _draw(ts){
    const ctx=this.ctx,w=CONFIG.canvasWidth,h=CONFIG.canvasHeight,theme=this.getTheme();
    const alpha=Math.min(this.accumulator/this.tickRate,1);
    ctx.fillStyle=settings.themeOverrideBg||theme.bg;ctx.fillRect(0,0,w,h);
    ctx.strokeStyle=theme.centerLine;ctx.lineWidth=2;
    switch(theme.lineStyle){case'dashed':ctx.setLineDash([8,12]);break;case'dotted':ctx.setLineDash([3,8]);break;default:ctx.setLineDash([]);}
    ctx.beginPath();ctx.moveTo(w/2,0);ctx.lineTo(w/2,h);ctx.stroke();ctx.setLineDash([]);
    this.paddleLeft.drawInterpolated(ctx,this.getLeftPaddleStyle(),alpha);
    this.paddleRight.drawInterpolated(ctx,this.getRightPaddleStyle(),alpha);
    this.ball.drawInterpolated(ctx,ts,alpha);
    for(const p of this.particles)p.draw(ctx,alpha);
    this._drawOverlay(ctx,w,h,theme);
    this.scoreLeftEl.textContent=this.paddleLeft.score;this.scoreRightEl.textContent=this.paddleRight.score;
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
    this.menuMode=document.getElementById('menuMode');this.menuSkins=document.getElementById('menuSkins');
    this.menuTheme=document.getElementById('menuTheme');this.menuPaddle=document.getElementById('menuPaddle');
    this.menuBall=document.getElementById('menuBall');
    this.pauseOverlay=document.getElementById('pauseOverlay');
    this.scoreboard=document.getElementById('scoreboard');this.canvas=document.getElementById('gameCanvas');
    this.controlsBar=document.getElementById('controlsBar');this.themeSwitcher=document.getElementById('themeSwitcher');
    this._buildThemePresets();this._buildPaddleStyleButtons();this._buildBallSkinButtons();this._buildThemeDots();
    this._bindClicks();this._bindSliders();this._bindColorPickers();this._syncUI();
  }

  /* ---- SHOW / HIDE ---- */
  showMainMenu(){
    this.game.state='idle';this.game.active=false;this.game.paused=false;
    this.menuOverlay.classList.remove('hidden');this.menuMain.classList.remove('hidden');
    [this.menuMode,this.menuSkins,this.menuTheme,this.menuPaddle,this.menuBall].forEach(m=>m.classList.add('hidden'));
    this.pauseOverlay.classList.add('hidden');this.scoreboard.classList.add('hidden');this.canvas.classList.add('hidden');
    this.themeSwitcher.classList.add('hidden');this.controlsBar.classList.remove('hidden');this._syncUI();
  }
  startGame(){
    this.menuOverlay.classList.add('hidden');this.pauseOverlay.classList.add('hidden');
    this.scoreboard.classList.remove('hidden');this.canvas.classList.remove('hidden');
    this.themeSwitcher.classList.remove('hidden');this.controlsBar.classList.remove('hidden');
    this._updateControlsBar();this._highlightThemeDots();this.game.sound.init();this.game.start();
  }
  pauseGame(){this.game.paused=true;this.pauseOverlay.classList.remove('hidden');this.themeSwitcher.classList.add('hidden');}
  resumeGame(){this.game.paused=false;this.pauseOverlay.classList.add('hidden');this.themeSwitcher.classList.remove('hidden');}
  backToMenu(){this.game.paused=false;this.showMainMenu();}

  /* ---- BUILD DYNAMIC UI ---- */
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
      const b=document.createElement('button');b.className='ball-skin-btn';b.dataset.skin=key;b.textContent=label;
      b.addEventListener('click',()=>this._onBallSkinClick(key));g.appendChild(b);
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

  /* ---- CLICK BINDINGS ---- */
  _bindClicks(){
    document.querySelectorAll('.menu-btn').forEach(b=>{b.addEventListener('click',e=>{const a=e.currentTarget.dataset.action;if(a)this._onAction(a);});});
  }
  _onAction(a){
    switch(a){
      case'play':this.startGame();break;
      case'mode':this._showSub(this.menuMode);this._highlightActiveMode();break;
      case'skins':this._showSub(this.menuSkins);break;
      case'theme-page':this._showSub(this.menuTheme);this._syncThemePage();break;
      case'paddle-page':this._showSub(this.menuPaddle);this._syncPaddlePage();break;
      case'ball-page':this._showSub(this.menuBall);this._syncBallPage();break;
      case'back':this._showSub(this.menuMain);this._syncUI();break;
      case'sound':settings.soundEnabled=!settings.soundEnabled;this._syncUI();break;
      case'effects':settings.effectsEnabled=!settings.effectsEnabled;this._syncUI();break;
      case'mode-pvp':settings.gameMode='pvp';this._highlightActiveMode();this._updateControlsBar();break;
      case'mode-ai':settings.gameMode='ai';this._highlightActiveMode();this._updateControlsBar();break;
      case'diff-easy':settings.difficulty='easy';this._highlightActiveMode();break;
      case'diff-medium':settings.difficulty='medium';this._highlightActiveMode();break;
      case'diff-hard':settings.difficulty='hard';this._highlightActiveMode();break;
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
      case'restart':this.pauseOverlay.classList.add('hidden');this.themeSwitcher.classList.remove('hidden');this.game.restart();break;
      case'quit':this.backToMenu();break;
    }
  }

  /* ---- THEME / PADDLE / BALL PAGE HANDLERS ---- */
  _onPresetClick(name){
    this.game.switchTheme(name);
    this._highlightThemeDots();this._syncThemePage();this._syncPaddlePage();this._syncBallPage();
  }
  _onPaddleStyleClick(side,key){
    if(side==='left')settings.leftPaddleStyle=(key===this.game.getTheme().paddleStyle?null:key);
    else settings.rightPaddleStyle=(key===this.game.getTheme().paddleStyle?null:key);
    this._syncPaddlePage();
  }
  _onBallSkinClick(key){settings.ballSkin=key;this.game.ball.skin=key;this._syncBallPage();}

  /* ---- SLIDER BINDINGS ---- */
  _bindSliders(){
    document.getElementById('glowSlider').addEventListener('input',e=>{
      settings.themeOverrideGlow=parseInt(e.target.value);document.getElementById('glowVal').textContent=e.target.value;applyThemeCSS(settings.theme);
    });
    document.getElementById('paddleWidthSlider').addEventListener('input',e=>{
      settings.paddleWidth=parseInt(e.target.value);document.getElementById('paddleWidthVal').textContent=e.target.value;this.game._syncDimensions();
    });
    document.getElementById('paddleHeightSlider').addEventListener('input',e=>{
      settings.paddleHeight=parseInt(e.target.value);document.getElementById('paddleHeightVal').textContent=e.target.value;this.game._syncDimensions();
    });
    document.getElementById('ballSizeSlider').addEventListener('input',e=>{
      settings.ballSize=parseInt(e.target.value);document.getElementById('ballSizeVal').textContent=e.target.value;this.game.ball.size=settings.ballSize;this._renderBallPreview();
    });
  }

  /* ---- COLOR PICKER BINDINGS ---- */
  _bindColorPickers(){
    document.getElementById('themeBg').addEventListener('input',e=>{settings.themeOverrideBg=e.target.value;applyThemeCSS(settings.theme);});
    document.getElementById('themeAccent').addEventListener('input',e=>{settings.themeOverrideAccent=e.target.value;applyThemeCSS(settings.theme);});
    document.getElementById('paddleLeftColor').addEventListener('input',e=>{settings.customPaddleLeft=e.target.value;this.game._applyThemeAndColors();});
    document.getElementById('paddleRightColor').addEventListener('input',e=>{settings.customPaddleRight=e.target.value;this.game._applyThemeAndColors();});
    document.getElementById('ballColor').addEventListener('input',e=>{settings.customBall=e.target.value;this.game._applyThemeAndColors();this._renderBallPreview();});
  }

  /* ---- PAGE SYNC ---- */
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

  /* ---- UTILITY ---- */
  _showSub(active){[this.menuMain,this.menuMode,this.menuSkins,this.menuTheme,this.menuPaddle,this.menuBall].forEach(m=>m.classList.add('hidden'));active.classList.remove('hidden');}
  _syncUI(){
    document.getElementById('modeLabel').textContent=settings.gameMode==='ai'?'vs AI ('+settings.difficulty.toUpperCase()+')':'PvP';
    const sl=document.getElementById('soundLabel'),sb=sl.parentElement;sl.textContent=settings.soundEnabled?'ON':'OFF';sb.classList.toggle('on',settings.soundEnabled);sb.classList.toggle('off',!settings.soundEnabled);
    const el=document.getElementById('effectsLabel'),eb=el.parentElement;el.textContent=settings.effectsEnabled?'ON':'OFF';eb.classList.toggle('on',settings.effectsEnabled);eb.classList.toggle('off',!settings.effectsEnabled);
  }
  _highlightActiveMode(){
    document.getElementById('difficultyGroup').classList.toggle('hidden',settings.gameMode!=='ai');
    document.querySelector('[data-action="mode-pvp"]').classList.toggle('active',settings.gameMode==='pvp');
    document.querySelector('[data-action="mode-ai"]').classList.toggle('active',settings.gameMode==='ai');
    document.querySelectorAll('.diff-choice').forEach(b=>b.classList.remove('active'));
    const ad=document.querySelector('[data-action="diff-'+settings.difficulty+'"]');if(ad)ad.classList.add('active');
    this._syncUI();
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
    if(!menu.menuOverlay.classList.contains('hidden')||!menu.pauseOverlay.classList.contains('hidden')){
      if(!menu.pauseOverlay.classList.contains('hidden'))menu.resumeGame();
      else{const subs=[menu.menuMode,menu.menuSkins,menu.menuTheme,menu.menuPaddle,menu.menuBall];if(subs.some(m=>!m.classList.contains('hidden')))menu._onAction('back');}
      return;
    }
    if(game.state==='playing'||game.state==='serving'||game.state==='goal'){if(game.paused)menu.resumeGame();else menu.pauseGame();}
    else if(game.state==='over')menu.backToMenu();
  });
})();
