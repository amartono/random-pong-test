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
  /* arena dimensions per mode */
  NORMAL_W:800,NORMAL_H:500,PINBALL_W:1200,PINBALL_H:500,
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
/*  POOL MODE CONFIGURATION & HELPERS                                   */
/* ------------------------------------------------------------------ */

const POOL_CONFIG = {
  outerFrameThickness: 14,
  railThickness: 28,
  innerRailHighlight: 3,
  cornerPocketRadius: 22,
  sidePocketRadius: 19,
  cornerPocketCaptureRadius: 18,
  sidePocketCaptureRadius: 16,
  pocketOpeningPadding: 5,
  paddleInset: 18,
  paddleVerticalSafety: 8,
  feltColor: '#0b7a38',
  feltDarkColor: '#045827',
  railColor: '#6d241c',
  railDarkColor: '#35100d',
  pocketColor: '#050505',
};

/** Calculate the felt bounds (inner playing area) from the rails */
function getPoolBounds(){
  const w=CONFIG.canvasWidth, h=CONFIG.canvasHeight, t=POOL_CONFIG.railThickness;
  return {left:t, right:w-t, top:t, bottom:h-t, width:w-2*t, height:h-2*t};
}

/** Return all 6 pocket objects */
function getPoolPockets(){
  const w=CONFIG.canvasWidth, h=CONFIG.canvasHeight;
  const fl=POOL_CONFIG.railThickness, fr=w-POOL_CONFIG.railThickness;
  const ft=POOL_CONFIG.railThickness, fb=h-POOL_CONFIG.railThickness;
  const cx=w/2;
  return [
    { id:'top-left',     type:'corner', x:fl, y:ft, visualRadius:POOL_CONFIG.cornerPocketRadius, captureRadius:POOL_CONFIG.cornerPocketCaptureRadius },
    { id:'top-center',   type:'side',   x:cx, y:ft, visualRadius:POOL_CONFIG.sidePocketRadius,   captureRadius:POOL_CONFIG.sidePocketCaptureRadius },
    { id:'top-right',    type:'corner', x:fr, y:ft, visualRadius:POOL_CONFIG.cornerPocketRadius, captureRadius:POOL_CONFIG.cornerPocketCaptureRadius },
    { id:'bottom-left',  type:'corner', x:fl, y:fb, visualRadius:POOL_CONFIG.cornerPocketRadius, captureRadius:POOL_CONFIG.cornerPocketCaptureRadius },
    { id:'bottom-center',type:'side',   x:cx, y:fb, visualRadius:POOL_CONFIG.sidePocketRadius,   captureRadius:POOL_CONFIG.sidePocketCaptureRadius },
    { id:'bottom-right', type:'corner', x:fr, y:fb, visualRadius:POOL_CONFIG.cornerPocketRadius, captureRadius:POOL_CONFIG.cornerPocketCaptureRadius },
  ];
}

/** Check if a position x (ball center) is inside a pocket opening on the TOP rail */
function isInsideTopPoolPocketOpening(x,ballR){
  const b=getPoolBounds();
  const openingPad=POOL_CONFIG.pocketOpeningPadding+ballR;
  const pockets=getPoolPockets().filter(p=>p.y===b.top);
  for(const p of pockets){
    const ohw=p.visualRadius+openingPad;
    if(x>p.x-ohw&&x<p.x+ohw)return true;
  }
  return false;
}
/** Same for BOTTOM rail */
function isInsideBottomPoolPocketOpening(x,ballR){
  const b=getPoolBounds();
  const openingPad=POOL_CONFIG.pocketOpeningPadding+ballR;
  const pockets=getPoolPockets().filter(p=>p.y===b.bottom);
  for(const p of pockets){
    const ohw=p.visualRadius+openingPad;
    if(x>p.x-ohw&&x<p.x+ohw)return true;
  }
  return false;
}
/** Check if y position is inside a LEFT rail pocket opening */
function isInsideLeftPoolPocketOpening(y,ballR){
  const b=getPoolBounds();
  const openingPad=POOL_CONFIG.pocketOpeningPadding+ballR;
  const pockets=getPoolPockets().filter(p=>p.x===b.left&&p.id.startsWith('top')||p.x===b.left&&p.id.startsWith('bottom'));
  for(const p of getPoolPockets()){
    if(p.x!==b.left)continue;
    if(p.y===b.top||p.y===b.bottom){
      const ohv=p.visualRadius+openingPad;
      if(y>p.y-ohv&&y<p.y+ohv)return true;
    }
  }
  return false;
}
/** Check if y position is inside a RIGHT rail pocket opening */
function isInsideRightPoolPocketOpening(y,ballR){
  const b=getPoolBounds();
  const openingPad=POOL_CONFIG.pocketOpeningPadding+ballR;
  for(const p of getPoolPockets()){
    if(p.x!==b.right)continue;
    if(p.y===b.top||p.y===b.bottom){
      const ohv=p.visualRadius+openingPad;
      if(y>p.y-ohv&&y<p.y+ohv)return true;
    }
  }
  return false;
}

/** Swept-segment pocket detection — prevents fast balls from tunneling through pockets */
function checkPoolPocketHit(ball){
  const cx=(ball.prevX+ball.x)/2, cy=(ball.prevY+ball.y)/2;
  const dx=ball.x-ball.prevX, dy=ball.y-ball.prevY;
  const travel=Math.sqrt(dx*dx+dy*dy);
  if(travel<0.001)return null;  // stationary
  const nx=dx/travel, ny=dy/travel;
  const br=(ball.radius!=null?ball.radius:ball.size/2);
  for(const p of getPoolPockets()){
    const cr=p.captureRadius+br*.35;
    // project pocket center onto segment
    let qx=(p.x-ball.prevX)*nx+(p.y-ball.prevY)*ny;
    qx=Math.max(0,Math.min(travel,qx));
    const qpx=ball.prevX+nx*qx, qpy=ball.prevY+ny*qx;
    const dist=Math.hypot(p.x-qpx,p.y-qpy);
    if(dist<=cr)return p;
  }
  return null;
}

/* ---- pool object-ball rack system ---- */
const POOL_RACK = { objectRadius:8, gap:0.6, restitution:0.92, railBounce:0.82, frictionPerTick:0.987, stopSpeed:0.06, ownershipThreshold:0.25, breakThreshold:1.5, paddleRestitution:0.95, animTicks:18 };
function choosePoolRackSide(){return Math.random()<0.5?'right':'left';}
function getPoolRackPositions(side){
  const r=POOL_RACK.objectRadius, gap=POOL_RACK.gap, fb=getPoolBounds();
  const hSpacing=r*2+gap, wSpacing=Math.sqrt(3)*r+gap*Math.sqrt(3)/2;
  const rackCX=side==='right'?fb.left+fb.width*0.65:fb.left+fb.width*0.35;
  const rackCY=fb.top+fb.height*0.50;
  const apexX=side==='right'?rackCX:rackCX+4*wSpacing; const dir=side==='right'?1:-1;
  const p=[]; for(let c=0;c<5;c++){const n=c+1,x=apexX+c*wSpacing*dir;for(let i=0;i<n;i++)p.push({x,y:rackCY+(i-n/2+.5)*hSpacing});}return p;
}
function getPoolRackApex(side){return getPoolRackPositions(side)[0];}
function createPoolObjectBalls(side){
  const pos=getPoolRackPositions(side), layout=[1,9,2,4,8,11,14,5,12,7,6,15,10,13,3], r=POOL_RACK.objectRadius;
  return layout.map((n,i)=>({number:n,skin:n+'ball',x:pos[i].x,y:pos[i].y,prevX:pos[i].x,prevY:pos[i].y,vx:0,vy:0,radius:r,angle:0,spin:0,active:true,pocketed:false,lastInfluencedBy:null,sleeping:false,sleepTimer:0,animTimer:0,pocketTarget:null}));
}
function createFreshPoolRack(){return createPoolObjectBalls(choosePoolRackSide());}
function poolMainBallSpawn(serveSide,pL,pR,bSize){
  const r=bSize/2, gap=8, fb=getPoolBounds();
  if(serveSide==='left'){const x=pL.x+pL.width+r+gap,y=Math.max(fb.top+r,Math.min(fb.bottom-r,pL.y+pL.height/2));return{x,y,vxDir:1};}
  else{const x=pR.x-r-gap,y=Math.max(fb.top+r,Math.min(fb.bottom-r,pR.y+pR.height/2));return{x,y,vxDir:-1};}
}
function launchPoolMainBallTowardRack(ball,rackSide){
  const apex=getPoolRackApex(rackSide),dx=apex.x-ball.x,dy=apex.y-ball.y,len=Math.hypot(dx,dy),spd=ball.speed||CONFIG.ballSpeedInitial;
  ball.dx=dx/len*spd;ball.dy=dy/len*spd;
}

/* ---- pool serve randomization ---- */
function rndRange(a,b){return a+Math.random()*(b-a);}
const POOL_SERVE = {
  freshSpeedMin:0.94, freshSpeedMax:1.06, respawnSpeedMin:0.94, respawnSpeedMax:1.06,
  breakOffset:POOL_RACK.objectRadius*0.45, breakJitter:Math.PI/180*0.75,
  respawnJitter:Math.PI/180*5, respawnYJitterRatio:0.08,
};
function randomPoolLaunchSpeed(type){
  const s=CONFIG.ballSpeedInitial;
  const mn=type==='fresh'?POOL_SERVE.freshSpeedMin:POOL_SERVE.respawnSpeedMin;
  const mx=type==='fresh'?POOL_SERVE.freshSpeedMax:POOL_SERVE.respawnSpeedMax;
  return Math.min(CONFIG.ballSpeedMax,s*rndRange(mn,mx));
}
function launchFreshPoolBreak(ball,rackSide){
  const apex=getPoolRackApex(rackSide);
  const bx=apex.x-ball.x,by=apex.y-ball.y,bl=Math.hypot(bx,by);
  const nx=bx/bl,ny=by/bl;
  const px=-ny,py=nx;
  const offset=rndRange(-POOL_SERVE.breakOffset,POOL_SERVE.breakOffset);
  const tx=apex.x+px*offset,ty=apex.y+py*offset;
  const dx=tx-ball.x,dy=ty-ball.y,dl=Math.hypot(dx,dy);
  const jitter=rndRange(-POOL_SERVE.breakJitter,POOL_SERVE.breakJitter);
  const rx=dx/dl*Math.cos(jitter)-dy/dl*Math.sin(jitter);
  const ry=dx/dl*Math.sin(jitter)+dy/dl*Math.cos(jitter);
  const spd=randomPoolLaunchSpeed('fresh');
  ball.speed=spd;ball.dx=rx*spd;ball.dy=ry*spd;
}
function launchRespawnPoolMainBall(ball,serveSide,objs){
  const fb=getPoolBounds();
  const cx=fb.left+fb.width/2;
  const cy=fb.top+fb.height/2+rndRange(-fb.height*POOL_SERVE.respawnYJitterRatio,fb.height*POOL_SERVE.respawnYJitterRatio);
  const dx=cx-ball.x,dy=cy-ball.y,dl=Math.hypot(dx,dy);
  const jitter=rndRange(-POOL_SERVE.respawnJitter,POOL_SERVE.respawnJitter);
  const rx=dx/dl*Math.cos(jitter)-dy/dl*Math.sin(jitter);
  const ry=dx/dl*Math.sin(jitter)+dy/dl*Math.cos(jitter);
  const spd=randomPoolLaunchSpeed('respawn');
  ball.speed=spd;
  if(serveSide==='left'){ball.dx=Math.abs(rx*spd);ball.dy=ry/1>1e-10?ry*spd:0;}
  else{ball.dx=-Math.abs(rx*spd);ball.dy=ry/1>1e-10?ry*spd:0;}
}

/* ---- pool spin config ---- */
const POOL_SPIN = {
  objDamping:0.985, spinStop:0.001, visualRoll:0.35,
  paddleSpin:0.025, paddleVelSpin:0.012, ballFriction:0.08, ballSpinTransfer:0.18,
  railSpinTransfer:0.04, railSpinRetention:0.72, maxObjSpin:0.35, maxMainSpin:0.45,
};

/* ---- pool sound config ---- */
const POOL_SOUND = {
  minClack:0.45, fullVol:6, cooldownTicks:4, maxPerTick:5,
  minGain:0.025, maxGain:0.12, pitchMin:0.92, pitchMax:1.08,
};

/* ---- pinball config & obstacle layout ---- */
const PINBALL = {
  frameThickness:14,innerMargin:20,
  largeR:26,mediumR:18,postR:10,
  slingRestitution:1.08,largeRestitution:1.10,mediumRestitution:1.07,railRestitution:0.98,postRestitution:1.02,
  bumperBoost:0.30,maxSpeed:CONFIG.ballSpeedMax,
  bCooldown:7,sCooldown:6,pCooldown:5,
  bFlash:14,sFlash:10,
  spinnerLen:44,spinnerW:7,spinnerAng:0.035,spinnerTransfer:0.20,spinnerFric:0.995,
  substepRatio:0.45
};
function mirrorX(x){return CONFIG.canvasWidth-x;}
function createPinballLayout(){
  const w=CONFIG.canvasWidth,h=CONFIG.canvasHeight;
  // --- Large bumpers (3 per side, 6 total) ---
  const llb=[{x:300,y:125,r:25,type:'large'},{x:350,y:250,r:27,type:'large'},{x:300,y:375,r:25,type:'large'}];
  const rlb=llb.map(b=>({...b,x:mirrorX(b.x)}));
  // --- Medium bumpers (2 per side, 4 total) ---
  const lmb=[{x:455,y:170,r:18,type:'medium'},{x:455,y:330,r:18,type:'medium'}];
  const rmb=lmb.map(b=>({...b,x:mirrorX(b.x)}));
  // --- Kickers (2 per side, 4 total) ---
  const lk=[{x:560,y:150,r:13,type:'kicker'},{x:560,y:350,r:13,type:'kicker'}];
  const rk=lk.map(b=>({...b,x:mirrorX(b.x)}));
  // --- Posts (2 per side, 4 total) ---
  const lp=[{x:205,y:210,r:9,type:'post'},{x:205,y:290,r:9,type:'post'}];
  const rp=lp.map(b=>({...b,x:mirrorX(b.x)}));
  // --- Slingshots (2 per side, 4 total) ---
  const lsu={a:[{x:155,y:105},{x:235,y:150},{x:170,y:215}]};
  const lsl={a:[{x:155,y:395},{x:235,y:350},{x:170,y:285}]};
  const rsu={a:lsu.a.map(p=>({x:mirrorX(p.x),y:p.y}))};
  const rsl={a:lsl.a.map(p=>({x:mirrorX(p.x),y:p.y}))};
  // --- Outer guide rails (3 per side, 6 total) ---
  const lgr=[{x1:105,y1:55,x2:225,y2:95},{x1:145,y1:235,x2:190,y2:250},{x1:105,y1:445,x2:225,y2:405}];
  const rgr=lgr.map(r=>({x1:mirrorX(r.x1),y1:r.y1,x2:mirrorX(r.x2),y2:r.y2}));
  // --- Inner rebound rails (2 per side, 4 total) ---
  const lir=[{x1:390,y1:90,x2:495,y2:125},{x1:390,y1:410,x2:495,y2:375}];
  const rir=lir.map(r=>({x1:mirrorX(r.x1),y1:r.y1,x2:mirrorX(r.x2),y2:r.y2}));
  // --- Spinners: inner pair (2) + outer pair (2) = 4 total ---
  const spinners=[
    {x:565,y:250,len:42,angle:Math.PI/2,av:PINBALL.spinnerAng,baseAv:PINBALL.spinnerAng},
    {x:635,y:250,len:42,angle:Math.PI/2,av:-PINBALL.spinnerAng,baseAv:-PINBALL.spinnerAng},
    {x:420,y:250,len:48,angle:Math.PI/4,av:PINBALL.spinnerAng,baseAv:PINBALL.spinnerAng},
    {x:780,y:250,len:48,angle:-Math.PI/4,av:-PINBALL.spinnerAng,baseAv:-PINBALL.spinnerAng},
  ];
  // --- Central diamonds (2) ---
  const ld={a:[{x:535,y:218},{x:560,y:250},{x:535,y:282},{x:510,y:250}]};
  const rd={a:ld.a.map(p=>({x:mirrorX(p.x),y:p.y}))};
  // --- Lane gates (2 per side, 4 total) ---
  const lgates=[{x:265,y:80,len:30,angle:.35,restAngle:.35,av:0},
               {x:265,y:420,len:30,angle:-.35,restAngle:-.35,av:0}];
  const rgates=lgates.map(g=>({...g,x:mirrorX(g.x),restAngle:-g.restAngle,angle:-g.angle}));
  // --- Rollover lane indicators (decorative, per side) ---
  const lanes=[{pts:[{x:230,y:70},{x:280,y:82},{x:310,y:105}]},
              {pts:[{x:230,y:430},{x:280,y:418},{x:310,y:395}]}];
  const rlanes=lanes.map(l=>({pts:l.pts.map(p=>({x:mirrorX(p.x),y:p.y}))}));
  return {
    bumpers:[...llb,...rlb,...lmb,...rmb],
    kickers:[...lk,...rk],
    posts:[...lp,...rp],
    slingshots:[lsu,lsl,rsu,rsl],
    rails:[...lgr,...rgr],
    innerRails:[...lir,...rir],
    spinners,
    diamonds:[ld,rd],
    gates:[...lgates,...rgates],
    lanes:[...lanes,...rlanes],
  };
}

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
  { key:'1ball',      label:'1-BALL' },
  { key:'2ball',      label:'2-BALL' },
  { key:'3ball',      label:'3-BALL' },
  { key:'4ball',      label:'4-BALL' },
  { key:'5ball',      label:'5-BALL' },
  { key:'6ball',      label:'6-BALL' },
  { key:'7ball',      label:'7-BALL' },
  { key:'9ball',      label:'9-BALL' },
  { key:'10ball',     label:'10-BALL' },
  { key:'11ball',     label:'11-BALL' },
  { key:'12ball',     label:'12-BALL' },
  { key:'13ball',     label:'13-BALL' },
  { key:'14ball',     label:'14-BALL' },
  { key:'15ball',     label:'15-BALL' },
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
  const W=canvas.width,H=canvas.height;
  const swatchesEl=document.getElementById('paintPalette');
  const sizeSlider=document.getElementById('paintSize');
  const sizeVal=document.getElementById('paintSizeVal');
  const colorInput=document.getElementById('paintColor');
  const loadGrid=document.getElementById('paintLoadGrid');

  // ---- state ----
  let tool='select';
  let color=colorInput.value||'#ff4444';
  let width=parseInt(sizeSlider.value)||8;
  let fillMode=false, mirrorX=false, mirrorY=false;

  let objects=[];         // scene graph
  let bgColor=null;       // background fill color
  let bgImage=null;       // offscreen canvas holding loaded ball raster
  let selected=null;
  let undoStack=[];

  // interaction
  let dragMode=null;      // 'move'|'resize'|'draw'
  let lastX=0,lastY=0, startX=0,startY=0;
  let tempObj=null, rsObj=null, rsBBox=null, rsHandle=-1;
  let _deferredSnap=null;  // snapshot taken on pointerDown, pushed on pointerUp (only if actually committed)

  // ---- palette ----
  const PALETTE=[
    '#ff4444','#ff8800','#ffdd00','#44ff44','#00cccc','#4488ff','#8844ff','#ff44ff',
    '#ffffff','#cccccc','#888888','#444444','#111111','#000000',
    '#ffaaaa','#ffcc88','#ffff88','#aaffaa','#88dddd','#aaccff','#ccaaff','#ffaaff',
  ];
  PALETTE.forEach(c=>{
    const s=document.createElement('span');s.className='palette-swatch';
    s.style.backgroundColor=c;s.title=c;
    s.addEventListener('click',()=>{color=c;colorInput.value=c;if(selected){_pushUndo();selected.color=c;render();}});
    swatchesEl.appendChild(s);
  });

  // ---- tool buttons ----
  document.querySelectorAll('#paintTools .paint-tool').forEach(b=>{
    b.addEventListener('click',()=>{
      document.querySelectorAll('#paintTools .paint-tool').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');tool=b.dataset.tool;
      if(tool!=='select'){selected=null;render();}
    });
  });

  // ---- option toggles ----
  document.querySelectorAll('#paintOpts .paint-opt').forEach(b=>{
    b.addEventListener('click',()=>{
      const o=b.dataset.opt;
      if(o==='fill'){fillMode=!fillMode;b.classList.toggle('active',fillMode);}
      else if(o==='mirrorX'){mirrorX=!mirrorX;b.classList.toggle('active',mirrorX);}
      else if(o==='mirrorY'){mirrorY=!mirrorY;b.classList.toggle('active',mirrorY);}
    });
  });

  sizeSlider.addEventListener('input',()=>{width=parseInt(sizeSlider.value);sizeVal.textContent=width;if(selected){_pushUndo();selected.width=width;render();}});
  colorInput.addEventListener('input',()=>{color=colorInput.value;if(selected){_pushUndo();selected.color=color;render();}});

  /* ================= geometry helpers ================= */
  function nid(){return 'o'+Math.random().toString(36).slice(2,9);}
  function hexToRgb(h){h=h.replace('#','');return[parseInt(h.substr(0,2),16),parseInt(h.substr(2,2),16),parseInt(h.substr(4,2),16)];}
  function cloneObj(o){return JSON.parse(JSON.stringify(o));}
  function pentPts(cx,cy,r){const a=[];for(let i=0;i<5;i++){const ang=-Math.PI/2+i*2*Math.PI/5;a.push({x:cx+Math.cos(ang)*r,y:cy+Math.sin(ang)*r});}return a;}
  function rectPts(x,y,w,h){return[{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}];}
  function ptsBBox(p){let mnx=1e9,mny=1e9,mxx=-1e9,mxy=-1e9;for(const q of p){mnx=Math.min(mnx,q.x);mny=Math.min(mny,q.y);mxx=Math.max(mxx,q.x);mxy=Math.max(mxy,q.y);}return{x:mnx,y:mny,w:mxx-mnx,h:mxy-mny};}
  function objBBox(o){
    if(o.kind==='ellipse')return{x:o.cx-o.rx,y:o.cy-o.ry,w:o.rx*2,h:o.ry*2};
    return ptsBBox(o.pts);
  }
  function translateObj(o,dx,dy){
    if(o.kind==='ellipse'){o.cx+=dx;o.cy+=dy;}
    else o.pts.forEach(p=>{p.x+=dx;p.y+=dy;});
  }
  function scaleClone(src,ob,nb){
    const o=cloneObj(src);
    const sx=ob.w>1?nb.w/ob.w:1, sy=ob.h>1?nb.h/ob.h:1;
    const map=(x,y)=>({x:nb.x+(x-ob.x)*sx, y:nb.y+(y-ob.y)*sy});
    if(o.kind==='ellipse'){const c=map(o.cx,o.cy);o.cx=c.x;o.cy=c.y;o.rx=Math.max(2,o.rx*sx);o.ry=Math.max(2,o.ry*sy);}
    else o.pts=o.pts.map(p=>map(p.x,p.y));
    return o;
  }
  function reflectObj(o,axis){
    const r=cloneObj(o);r.id=nid();
    const fx=x=>W-x, fy=y=>H-y;
    if(r.kind==='ellipse'){if(axis==='x')r.cx=fx(r.cx);else r.cy=fy(r.cy);}
    else r.pts=r.pts.map(p=>({x:axis==='x'?fx(p.x):p.x, y:axis==='y'?fy(p.y):p.y}));
    return r;
  }
  function distSeg(px,py,a,b){
    const dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy;
    if(l2===0)return Math.hypot(px-a.x,py-a.y);
    let t=((px-a.x)*dx+(py-a.y)*dy)/l2;t=Math.max(0,Math.min(1,t));
    return Math.hypot(px-(a.x+t*dx),py-(a.y+t*dy));
  }
  function pointInPoly(px,py,pts){
    let inside=false;
    for(let i=0,j=pts.length-1;i<pts.length;j=i++){
      const xi=pts[i].x,yi=pts[i].y,xj=pts[j].x,yj=pts[j].y;
      if(((yi>py)!==(yj>py))&&(px<(xj-xi)*(py-yi)/(yj-yi)+xi))inside=!inside;
    }
    return inside;
  }
  function hitObj(o,px,py){
    const tol=Math.max(o.width||6,7);
    if(o.kind==='ellipse'){
      const v=((px-o.cx)/(o.rx||1))**2+((py-o.cy)/(o.ry||1))**2;
      if(o.fill)return v<=1.1;
      return Math.abs(Math.sqrt(v)-1)*Math.min(o.rx,o.ry)<tol;
    }
    if(o.kind==='poly'){
      if(o.fill&&pointInPoly(px,py,o.pts))return true;
      for(let i=0;i<o.pts.length;i++){if(distSeg(px,py,o.pts[i],o.pts[(i+1)%o.pts.length])<tol)return true;}
      return false;
    }
    // path (open)
    for(let i=0;i<o.pts.length-1;i++){if(distSeg(px,py,o.pts[i],o.pts[i+1])<tol)return true;}
    if(o.pts.length===1)return Math.hypot(px-o.pts[0].x,py-o.pts[0].y)<tol;
    return false;
  }

  /* ================= drawing ================= */
  function drawObj(c,o){
    c.lineJoin='round';c.lineCap='round';
    if(o.kind==='ellipse'){
      c.beginPath();c.ellipse(o.cx,o.cy,Math.abs(o.rx),Math.abs(o.ry),0,0,Math.PI*2);
      if(o.fill){c.fillStyle=o.color;c.fill();}
      else{c.strokeStyle=o.color;c.lineWidth=o.width;c.stroke();}
      return;
    }
    c.beginPath();c.moveTo(o.pts[0].x,o.pts[0].y);
    for(let i=1;i<o.pts.length;i++)c.lineTo(o.pts[i].x,o.pts[i].y);
    if(o.kind==='poly')c.closePath();
    if(o.kind==='poly'&&o.fill){c.fillStyle=o.color;c.fill();}
    else{c.strokeStyle=o.color;c.lineWidth=o.width;c.stroke();}
  }
  function handleRects(bb){
    const hs=7,cx=bb.x+bb.w/2,cy=bb.y+bb.h/2;
    const pts=[[bb.x,bb.y],[cx,bb.y],[bb.x+bb.w,bb.y],[bb.x+bb.w,cy],[bb.x+bb.w,bb.y+bb.h],[cx,bb.y+bb.h],[bb.x,bb.y+bb.h],[bb.x,cy]];
    return pts.map(p=>({x:p[0]-hs/2,y:p[1]-hs/2,w:hs,h:hs}));
  }
  function drawSelection(o){
    const bb=objBBox(o);
    ctx.save();ctx.strokeStyle='#00e0ff';ctx.lineWidth=1;ctx.setLineDash([4,3]);
    ctx.strokeRect(bb.x,bb.y,bb.w,bb.h);ctx.setLineDash([]);
    ctx.fillStyle='#00e0ff';
    handleRects(bb).forEach(h=>ctx.fillRect(h.x,h.y,h.w,h.h));
    ctx.restore();
  }
  // composite the whole scene (no selection handles) into any 2d context
  function composite(c){
    c.clearRect(0,0,W,H);
    if(bgColor){c.fillStyle=bgColor;c.fillRect(0,0,W,H);}
    if(bgImage)c.drawImage(bgImage,0,0,W,H);
    for(const o of objects)drawObj(c,o);
    if(tempObj)drawObj(c,tempObj);
  }
  function render(showHandles=true){
    composite(ctx);
    if(showHandles&&selected&&tool==='select')drawSelection(selected);
  }
  // flatten everything into the bgImage raster (used before smudge/blend)
  function bakeScene(){
    const off=document.createElement('canvas');off.width=W;off.height=H;
    composite(off.getContext('2d'));
    bgImage=off;bgColor=null;objects=[];selected=null;
  }
  // local smudge/blend: soften pixels under the brush so bordering colors blend into a gradient
  function smudge(cx,cy,r){
    if(!bgImage)return;
    const octx=bgImage.getContext('2d');
    const full=octx.getImageData(0,0,W,H);
    const src=new Uint8ClampedArray(full.data);
    const d=full.data;
    const k=Math.max(1,Math.round(r/6));   // kernel radius scales with brush
    const r2=r*r;
    const x0=Math.max(0,Math.floor(cx-r)),x1=Math.min(W,Math.ceil(cx+r));
    const y0=Math.max(0,Math.floor(cy-r)),y1=Math.min(H,Math.ceil(cy+r));
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
      const dx=x-cx,dy=y-cy,dd=dx*dx+dy*dy;if(dd>r2)continue;
      let R=0,G=0,B=0,A=0,n=0;
      for(let ky=-k;ky<=k;ky++)for(let kx=-k;kx<=k;kx++){
        const nx=x+kx,ny=y+ky;if(nx<0||ny<0||nx>=W||ny>=H)continue;
        const j=(ny*W+nx)*4;R+=src[j];G+=src[j+1];B+=src[j+2];A+=src[j+3];n++;
      }
      const t=1-Math.sqrt(dd)/r;          // stronger at brush center
      const bl=0.85*t;                     // blend amount
      const i=(y*W+x)*4;
      d[i]  =src[i]  *(1-bl)+(R/n)*bl;
      d[i+1]=src[i+1]*(1-bl)+(G/n)*bl;
      d[i+2]=src[i+2]*(1-bl)+(B/n)*bl;
      d[i+3]=src[i+3]*(1-bl)+(A/n)*bl;
    }
    octx.putImageData(full,0,0);
  }

  /* ================= undo ================= */
  function cloneCanvas(c){const o=document.createElement('canvas');o.width=W;o.height=H;o.getContext('2d').drawImage(c,0,0);return o;}
  function _snap(){return{objs:JSON.stringify(objects),bgColor,bg:bgImage?cloneCanvas(bgImage):null};}
  function _pushUndo(){
    undoStack.push(_snap());
    if(undoStack.length>30)undoStack.shift();
  }
  // commit a deferred snapshot to the undo stack (call in onPointerUp when actual work was done)
  // On phantom clicks (zero-size shapes), _discardSnap removes it from the stack.
  function _commitSnap(){
    if(!_deferredSnap)return;
    _deferredSnap=null;
    // snapshot already on the stack; nothing more to do
  }
  function _discardSnap(){
    // pop the wasted entry pushed in onPointerDown for a zero-size shape
    if(undoStack.length>1)undoStack.pop();
    _deferredSnap=null;
  }

  /* ================= pointer ================= */
  function toCanvas(ex,ey){
    const r=canvas.getBoundingClientRect();
    return{x:(ex-r.left)*(W/r.width), y:(ey-r.top)*(H/r.height)};
  }
  function shapeOpts(){return{color,width,fill:fillMode};}
  function commitObj(o){
    objects.push(o);
    if(mirrorX)objects.push(reflectObj(o,'x'));
    if(mirrorY)objects.push(reflectObj(o,'y'));
    if(mirrorX&&mirrorY)objects.push(reflectObj(reflectObj(o,'x'),'y'));
  }

  return {canvas,ctx,loadGrid,

    clear(){objects=[];bgColor=null;bgImage=null;selected=null;undoStack=[];_pushUndo();render();},
    resetUndo(){undoStack=[];_pushUndo();},
    _pushUndo,
    undo(){
      // Pop and restore the PREVIOUS state directly — the top of the stack
      // IS the state before the last action, so restore what we pop.
      if(undoStack.length<=1)return;  // keep baseline
      const s=undoStack.pop();
      objects=JSON.parse(s.objs);bgColor=s.bgColor;bgImage=s.bg?cloneCanvas(s.bg):null;selected=null;render();
    },
    deleteSelected(){if(selected){_pushUndo();objects=objects.filter(o=>o!==selected);selected=null;render();}},

    loadBall(skinKey){
      const off=document.createElement('canvas');off.width=W;off.height=H;
      const octx=off.getContext('2d');
      if(CustomBallRegistry.isCustom(skinKey)){
        const img=CustomBallRegistry.image(skinKey);
        if(img&&img.complete)octx.drawImage(img,0,0,W,H);
      }else{
        BallRenderer.draw(octx,W/2,H/2,W,'#ffffff',skinKey,0);
      }
      bgImage=off;objects=[];selected=null;undoStack=[];_pushUndo();render();
    },
    loadImageSrc(src){
      const img=new Image();
      img.onload=()=>{const off=document.createElement('canvas');off.width=W;off.height=H;off.getContext('2d').drawImage(img,0,0,W,H);bgImage=off;objects=[];selected=null;undoStack=[];_pushUndo();render();};
      img.src=src;
    },

    getDataURL(){render(false);const url=canvas.toDataURL('image/png');render(true);return url;},

    onPointerDown(ex,ey){
      const p=toCanvas(ex,ey);startX=p.x;startY=p.y;lastX=p.x;lastY=p.y;
      _deferredSnap=false;   // clear any pending flag

      if(tool==='select'){
        if(selected){
          const bb=objBBox(selected),hs=handleRects(bb);
          for(let i=0;i<hs.length;i++){if(p.x>=hs[i].x-3&&p.x<=hs[i].x+hs[i].w+3&&p.y>=hs[i].y-3&&p.y<=hs[i].y+hs[i].h+3){
            dragMode='resize';rsHandle=i;rsObj=cloneObj(selected);rsBBox=bb;_pushUndo();_deferredSnap=true;return;}}
        }
        // pick topmost under cursor
        let found=null;for(let i=objects.length-1;i>=0;i--){if(hitObj(objects[i],p.x,p.y)){found=objects[i];break;}}
        selected=found;
        if(found){dragMode='move';_pushUndo();_deferredSnap=true;}
        render();return;
      }
      if(tool==='fill'){
        _pushUndo();
        let hitOne=null;for(let i=objects.length-1;i>=0;i--){if(hitObj(objects[i],p.x,p.y)){hitOne=objects[i];break;}}
        if(hitOne){hitOne.fill=true;hitOne.color=color;}
        else bgColor=color;
        render();return;
      }
      if(tool==='blend'){
        _pushUndo();bakeScene();dragMode='blend';smudge(p.x,p.y,width*1.5);render();return;
      }
      if(tool==='eraser'){
        for(let i=objects.length-1;i>=0;i--){if(hitObj(objects[i],p.x,p.y)){_pushUndo();objects.splice(i,1);render();return;}}
        return;
      }
      // drawing tools: push undo now; if the shape turns out zero-size, we'll pop it in onPointerUp
      _pushUndo();_deferredSnap=true;dragMode='draw';
      const o=shapeOpts();
      if(tool==='brush')tempObj={id:nid(),kind:'path',pts:[{x:p.x,y:p.y}],color:o.color,width:o.width};
      else if(tool==='line')tempObj={id:nid(),kind:'path',pts:[{x:p.x,y:p.y},{x:p.x,y:p.y}],color:o.color,width:o.width};
      else if(tool==='rect')tempObj={id:nid(),kind:'poly',pts:rectPts(p.x,p.y,0,0),color:o.color,width:o.width,fill:o.fill};
      else if(tool==='pentagon')tempObj={id:nid(),kind:'poly',pts:pentPts(p.x,p.y,0),color:o.color,width:o.width,fill:o.fill};
      else if(tool==='circle')tempObj={id:nid(),kind:'ellipse',cx:p.x,cy:p.y,rx:0,ry:0,color:o.color,width:o.width,fill:o.fill};
      render();
    },

    onPointerMove(ex,ey){
      if(!dragMode)return;
      const p=toCanvas(ex,ey);

      if(dragMode==='blend'){
        // smudge along the drag path (interpolate to avoid gaps)
        const r=width*1.5, steps=Math.max(1,Math.round(Math.hypot(p.x-lastX,p.y-lastY)/(r/2)));
        for(let s=1;s<=steps;s++){const t=s/steps;smudge(lastX+(p.x-lastX)*t,lastY+(p.y-lastY)*t,r);}
        lastX=p.x;lastY=p.y;render();return;
      }
      if(dragMode==='move'&&selected){translateObj(selected,p.x-lastX,p.y-lastY);lastX=p.x;lastY=p.y;render();return;}
      if(dragMode==='resize'&&selected){
        const nb={x:rsBBox.x,y:rsBBox.y,w:rsBBox.w,h:rsBBox.h};
        // adjust edges based on handle index (0TL 1T 2TR 3R 4BR 5B 6BL 7L)
        const right=rsBBox.x+rsBBox.w, bottom=rsBBox.y+rsBBox.h;
        if([0,6,7].includes(rsHandle)){nb.x=p.x;nb.w=right-p.x;}
        if([2,3,4].includes(rsHandle)){nb.w=p.x-rsBBox.x;}
        if([0,1,2].includes(rsHandle)){nb.y=p.y;nb.h=bottom-p.y;}
        if([4,5,6].includes(rsHandle)){nb.h=p.y-rsBBox.y;}
        if(nb.w<4)nb.w=4;if(nb.h<4)nb.h=4;
        const idx=objects.indexOf(selected);
        const scaled=scaleClone(rsObj,rsBBox,nb);
        if(idx>=0)objects[idx]=scaled;selected=scaled;render();return;
      }
      if(dragMode==='draw'&&tempObj){
        if(tool==='brush')tempObj.pts.push({x:p.x,y:p.y});
        else if(tool==='line')tempObj.pts[1]={x:p.x,y:p.y};
        else if(tool==='rect')tempObj.pts=rectPts(Math.min(startX,p.x),Math.min(startY,p.y),Math.abs(p.x-startX),Math.abs(p.y-startY));
        else if(tool==='pentagon')tempObj.pts=pentPts(startX,startY,Math.hypot(p.x-startX,p.y-startY));
        else if(tool==='circle'){tempObj.cx=(startX+p.x)/2;tempObj.cy=(startY+p.y)/2;tempObj.rx=Math.abs(p.x-startX)/2;tempObj.ry=Math.abs(p.y-startY)/2;}
        render();
      }
    },

    onPointerUp(){
      if(!dragMode)return;   // guard: only process once per draw action
      if(dragMode==='draw'&&tempObj){
        const bb=objBBox(tempObj);
        if(tool==='brush'||bb.w>2||bb.h>2){
          commitObj(tempObj);_commitSnap();   // real draw: keep the undo entry
        }else{
          _discardSnap();   // zero-size shape: pop the wasted undo entry
        }
        tempObj=null;
      }
      if(dragMode==='move'||dragMode==='resize')_commitSnap();  // select/move/resize always real
      dragMode=null;rsHandle=-1;rsObj=null;render();
    },

    buildLoadGrid(){
      loadGrid.innerHTML='';
      const all=[];
      for(const s of BALL_SKINS)all.push(s);
      for(const c of CustomBallRegistry.list())all.push({key:c.id,label:c.name});
      all.forEach(skin=>{
        const div=document.createElement('div');div.className='paint-load-item';
        const thumb=document.createElement('canvas');thumb.width=48;thumb.height=48;
        BallRenderer.draw(thumb.getContext('2d'),24,24,44,'#ffffff',skin.key,0);
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
      case'1ball':this._billiardSolid(ctx,x,y,h,'#f2d21b',1);break;       // yellow
      case'2ball':this._billiardSolid(ctx,x,y,h,'#2454c6',2);break;       // blue
      case'3ball':this._billiardSolid(ctx,x,y,h,'#cf2f2f',3);break;       // red
      case'4ball':this._billiardSolid(ctx,x,y,h,'#6b3ea6',4);break;       // purple
      case'5ball':this._billiardSolid(ctx,x,y,h,'#e47b22',5);break;       // orange
      case'6ball':this._billiardSolid(ctx,x,y,h,'#2f8a4a',6);break;       // green
      case'7ball':this._billiardSolid(ctx,x,y,h,'#7f2631',7);break;       // maroon
      case'9ball':this._billiardStripe(ctx,x,y,h,'#f2d21b',9);break;     // yellow stripe
      case'10ball':this._billiardStripe(ctx,x,y,h,'#2454c6',10);break;    // blue stripe
      case'11ball':this._billiardStripe(ctx,x,y,h,'#cf2f2f',11);break;    // red stripe
      case'12ball':this._billiardStripe(ctx,x,y,h,'#6b3ea6',12);break;    // purple stripe
      case'13ball':this._billiardStripe(ctx,x,y,h,'#e47b22',13);break;    // orange stripe
      case'14ball':this._billiardStripe(ctx,x,y,h,'#2f8a4a',14);break;    // green stripe
      case'15ball':this._billiardStripe(ctx,x,y,h,'#7f2631',15);break;    // maroon stripe
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
  // Uses an offscreen anti-aliased circular mask (destination-in) instead of ctx.clip(),
  // because clip() has HARD aliased edges while arc()+fill masking is smooth — matching
  // the procedural balls. Masked+shaded result is cached per source image + size (WeakMap
  // auto-invalidates when a ball is edited and its Image object is replaced).
  _maskCache:new WeakMap(),
  _getMasked(img,d,shading){
    let m=this._maskCache.get(img);
    if(!m){m=new Map();this._maskCache.set(img,m);}
    const key=d+'|'+(shading?1:0);
    let c=m.get(key);
    if(!c){c=this._buildMasked(img,d,shading);m.set(key,c);}
    return c;
  },
  _buildMasked(img,d,shading){
    const c=document.createElement('canvas');c.width=d;c.height=d;
    const g=c.getContext('2d');
    g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
    // draw the source image with a tiny overscan so its own soft edge sits outside the mask
    const over=d*1.04,o=(over-d)/2;
    g.drawImage(img,-o,-o,over,over);
    // keep only what's inside an anti-aliased circle (smooth edge, unlike clip())
    g.globalCompositeOperation='destination-in';
    g.beginPath();g.arc(d/2,d/2,d/2,0,Math.PI*2);g.fill();
    // 3D shading, confined to the circle via source-atop
    if(shading){
      g.globalCompositeOperation='source-atop';
      const hh=d/2;
      const sg=g.createRadialGradient(hh-hh*.3,hh-hh*.35,hh*.03,hh,hh,hh);
      sg.addColorStop(0,'rgba(255,255,255,0)');
      sg.addColorStop(.5,'rgba(255,255,255,0)');
      sg.addColorStop(1,'rgba(0,0,0,.35)');
      g.fillStyle=sg;g.fillRect(0,0,d,d);
    }
    g.globalCompositeOperation='source-over';
    return c;
  },
  _drawImageBall(ctx,x,y,h,img,shading){
    if(!img||!img.complete||img.naturalWidth===0)return;
    const d=Math.max(2,Math.round(h*2));
    const masked=this._getMasked(img,d,shading);
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    ctx.drawImage(masked,x-h,y-h,h*2,h*2);
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

  // -- soccer: fully procedural classic black-and-white paneled soccer ball
  _soccer(ctx,x,y,r){
    const TAU=Math.PI*2;
    const P=(nx,ny)=>[x+nx*r,y+ny*r];
    const poly=(pts,fill,stroke,lw)=>{
      ctx.beginPath();ctx.moveTo(...P(pts[0][0],pts[0][1]));
      for(let i=1;i<pts.length;i++)ctx.lineTo(...P(pts[i][0],pts[i][1]));
      ctx.closePath();
      if(fill){ctx.fillStyle=fill;ctx.fill();}
      if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke();}
    };
    ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.clip();

    // white base
    ctx.fillStyle='#f8f8f5';ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();

    const sw=Math.max(.55,r*.028),bk='#050505',sk='#222',wh='#f8f8f5';
    const small=r<11;

    if(small){
      // Simplified: 3 large black panels + major seams
      const B1=[[-.45,-.42],[-.62,-.65],[-.38,-.80],[-.15,-.68],[-.15,-.42]];
      const B2=[[.48,.28],[.68,.52],[.55,.78],[.25,.72],[.18,.48]];
      const B3=[[-.22,.05],[-.05,.25],[.15,.20],[.18,-.02],[.00,-.12]];
      poly(B1,bk,null,0);poly(B2,bk,null,0);poly(B3,bk,null,0);
      ctx.strokeStyle=sk;ctx.lineWidth=sw;ctx.lineJoin='round';
      poly(B1,null,sk,sw);poly(B2,null,sk,sw);poly(B3,null,sk,sw);
      for(const[a,b]of[[[-.15,-.42],[-.22,.05]],[[-.15,-.42],[.00,-.12]],[[-.05,.25],[.18,.48]],[[.18,-.02],[.48,.28]],[[-.22,.05],[-.45,-.42]]]){
        ctx.beginPath();ctx.moveTo(...P(a[0],a[1]));ctx.lineTo(...P(b[0],b[1]));ctx.stroke();
      }
    }else{
      // Full detail: 5 black pentagons spread to edges, clearly separated
      const bc=[[-.12,.08],[-.02,.22],[.10,.15],[.12,-.02],[.00,-.08]];     // small center
      const bl=[[-.42,.40],[-.62,.20],[-.65,-.05],[-.48,-.08],[-.30,.15]];   // left
      const bt=[[.35,-.38],[.58,-.22],[.55,.05],[.38,.12],[.22,-.05]];       // top-right
      const br=[[.55,.30],[.72,.52],[.60,.75],[.30,.70],[.22,.48]];          // right-bottom
      const bb=[[-.28,.68],[-.52,.45],[-.60,.15],[-.42,.05],[-.20,.30]];      // bottom-left

      poly(bc,bk,null,0);poly(bl,bk,null,0);poly(bt,bk,null,0);poly(br,bk,null,0);poly(bb,bk,null,0);

      // White panels between
      poly([[-.12,.08],[-.30,.15],[-.42,.40],[-.28,.68],[-.20,.30],[-.02,.22]],wh,null,0); // left
      poly([[-.02,.22],[.10,.15],[.35,-.38],[.58,-.22],[.55,.30],[.22,.48]],wh,null,0);    // right
      poly([[-.12,.08],[-.30,.15],[-.20,.30],[.00,-.08]],wh,null,0);                       // bottom
      poly([[-.12,.08],[.00,-.08],[.22,-.05],[.35,-.38]],wh,null,0);                       // top

      ctx.strokeStyle=sk;ctx.lineWidth=sw;ctx.lineJoin='round';
      poly(bc,null,sk,sw);poly(bl,null,sk,sw);poly(bt,null,sk,sw);poly(br,null,sk,sw);poly(bb,null,sk,sw);
      poly([[-.12,.08],[-.30,.15],[-.42,.40],[-.28,.68],[-.20,.30],[-.02,.22]],null,sk,sw);
      poly([[-.02,.22],[.10,.15],[.35,-.38],[.58,-.22],[.55,.30],[.22,.48]],null,sk,sw);
      poly([[-.12,.08],[-.30,.15],[-.20,.30],[.00,-.08]],null,sk,sw);
      poly([[-.12,.08],[.00,-.08],[.22,-.05],[.35,-.38]],null,sk,sw);

      for(const[a,b]of[[[-.42,.40],[-.62,.20]],[[-.62,.20],[-.65,-.05]],[[-.65,-.05],[-.48,-.08]],
        [[.35,-.38],[.58,-.22]],[[.58,-.22],[.55,.05]],[[.55,.30],[.72,.52]],[[.72,.52],[.60,.75]],
        [[.60,.75],[.30,.70]],[[-.28,.68],[-.52,.45]],[[-.52,.45],[-.60,.15]],[[-.60,.15],[-.42,.05]],
        [[.00,-.08],[.22,-.05]],[[-.20,.30],[-.28,.68]],[[.22,.48],[.55,.30]]]){
        ctx.beginPath();ctx.moveTo(...P(a[0],a[1]));ctx.lineTo(...P(b[0],b[1]));ctx.stroke();
      }
    }

    // subtle highlight
    ctx.fillStyle='rgba(255,255,255,.08)';
    ctx.beginPath();ctx.ellipse(x-r*.20,y-r*.28,r*.12,r*.06,-.4,0,TAU);ctx.fill();

    ctx.restore();
    // ball outline
    ctx.strokeStyle='#2a2a2a';ctx.lineWidth=Math.max(.5,r*.022);
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
    // hand-tuned colors for black ball — derived lighten/darken collapse to #000 on near-black
    const highlight='#333', base='#111', shadow='#000', outline='#444', numColor='#111';
    const grad=ctx.createRadialGradient(x-r*.25,y-r*.3,r*.06,x,y,r);
    grad.addColorStop(0,highlight);grad.addColorStop(.82,base);grad.addColorStop(1,shadow);
    ctx.fillStyle=grad;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=outline;ctx.lineWidth=.8;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='#fafafa';ctx.beginPath();ctx.arc(x,y,r*.52,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#333';ctx.lineWidth=.7;ctx.beginPath();ctx.arc(x,y,r*.52,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle=numColor;ctx.font=`900 ${r*1.05}px Arial,Helvetica,sans-serif`;
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('8',x,y+1);
    ctx.fillStyle='rgba(255,255,255,.22)';ctx.beginPath();ctx.ellipse(x-r*.20,y-r*.28,r*.18,r*.10,-.4,0,Math.PI*2);ctx.fill();
  },

  /** Shared billiard solid ball (1–8): colored sphere + white number patch + number */
  _billiardSolid(ctx,x,y,r,baseColor,num){
    const l=lighten(baseColor,.15), d=darken(baseColor,.25);
    const grad=ctx.createRadialGradient(x-r*.25,y-r*.3,r*.06,x,y,r);
    grad.addColorStop(0,l);grad.addColorStop(.82,baseColor);grad.addColorStop(1,d);
    ctx.fillStyle=grad;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=darken(baseColor,.3);ctx.lineWidth=.8;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();
    // white number patch
    ctx.fillStyle='#fafafa';ctx.beginPath();ctx.arc(x,y,r*.52,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=darken(baseColor,.4);ctx.lineWidth=.7;ctx.beginPath();ctx.arc(x,y,r*.52,0,Math.PI*2);ctx.stroke();
    // number (double-digit slightly smaller)
    const fs=num>=10?r*.85:r*1.05;
    ctx.fillStyle=darken(baseColor,.2);ctx.font=`900 ${fs}px Arial,Helvetica,sans-serif`;
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(num),x,y+1);
    // highlight ellipse
    ctx.fillStyle='rgba(255,255,255,.22)';ctx.beginPath();ctx.ellipse(x-r*.20,y-r*.28,r*.18,r*.10,-.4,0,Math.PI*2);ctx.fill();
  },

  /** Shared billiard striped ball (9–15): white sphere + colored band + number */
  _billiardStripe(ctx,x,y,r,stripeColor,num){
    // white base sphere with shading
    const wg=ctx.createRadialGradient(x-r*.25,y-r*.3,r*.06,x,y,r);
    wg.addColorStop(0,'#ffffff');wg.addColorStop(.55,'#f0f0f0');wg.addColorStop(.85,'#e0e0e0');wg.addColorStop(1,'#c8c8c8');
    ctx.fillStyle=wg;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
    // colored stripe band (clipped inside ball)
    ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.clip();
    const sH=r*.46;  // stripe half-height
    const sg=ctx.createLinearGradient(x,y-sH,x,y+sH);
    sg.addColorStop(0,'#c8c8c8');
    sg.addColorStop(.12,lighten(stripeColor,.1));
    sg.addColorStop(.5,stripeColor);
    sg.addColorStop(.88,lighten(stripeColor,.1));
    sg.addColorStop(1,darken(stripeColor,.1));
    ctx.fillStyle=sg;ctx.fillRect(x-r,y-sH,r*2,sH*2);
    // soft shadow at stripe top/bottom for 3D wrap
    const st=ctx.createLinearGradient(x,y-sH,x,y);
    st.addColorStop(0,'rgba(255,255,255,.15)');st.addColorStop(.15,'rgba(0,0,0,.08)');st.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=st;ctx.fillRect(x-r,y-sH,r*2,sH);
    ctx.restore();
    // outline
    ctx.strokeStyle='#aaa';ctx.lineWidth=.8;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();
    // white number patch (same as solids)
    ctx.fillStyle='#fafafa';ctx.beginPath();ctx.arc(x,y,r*.52,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=darken(stripeColor,.3);ctx.lineWidth=.7;ctx.beginPath();ctx.arc(x,y,r*.52,0,Math.PI*2);ctx.stroke();
    // number
    const fs=num>=10?r*.85:r*1.05;
    ctx.fillStyle=darken(stripeColor,.15);ctx.font=`900 ${fs}px Arial,Helvetica,sans-serif`;
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(num),x,y+1);
    // highlight ellipse
    ctx.fillStyle='rgba(255,255,255,.25)';ctx.beginPath();ctx.ellipse(x-r*.20,y-r*.28,r*.18,r*.10,-.4,0,Math.PI*2);ctx.fill();
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
  playPoolClack(strength){
    if(!this.initialized)this.init();if(!this.ctx)return;if(this.ctx.state==='suspended')this.ctx.resume();
    const t=this.ctx.currentTime;
    const g=this.ctx.createGain();
    const vol=POOL_SOUND.minGain+(POOL_SOUND.maxGain-POOL_SOUND.minGain)*(strength||0.5);
    g.gain.setValueAtTime(vol*0.7,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.035);
    g.connect(this.ctx.destination);
    // High transient click
    const o=this.ctx.createOscillator();
    const freq=1200*rndRange(POOL_SOUND.pitchMin,POOL_SOUND.pitchMax);
    o.type='triangle';o.frequency.setValueAtTime(freq,t);
    o.frequency.exponentialRampToValueAtTime(freq*0.3,t+0.03);
    o.connect(g);o.start(t);o.stop(t+0.04);
    // Noise burst
    const buf=this.ctx.createBuffer(1,this.ctx.sampleRate*0.02,this.ctx.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,3)*0.3;
    const bs=this.ctx.createBufferSource();bs.buffer=buf;
    const bg=this.ctx.createGain();bg.gain.setValueAtTime(vol*0.5,t);bg.gain.exponentialRampToValueAtTime(0.001,t+0.025);
    const bf=this.ctx.createBiquadFilter();bf.type='bandpass';bf.frequency.setValueAtTime(2500,t);bf.Q.setValueAtTime(2,t);
    bs.connect(bf).connect(bg).connect(this.ctx.destination);
    bs.start(t);bs.stop(t+0.025);
  }
  playPinballSound(type){
    if(!this.initialized)this.init();if(!this.ctx)return;if(this.ctx.state==='suspended')this.ctx.resume();
    const t=this.ctx.currentTime;
    const n=(freq,start,dur,gain,wave)=>{const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=wave||'square';o.frequency.setValueAtTime(freq,start);g.gain.setValueAtTime(gain,start);g.gain.exponentialRampToValueAtTime(.001,start+dur);o.connect(g).connect(this.ctx.destination);o.start(start);o.stop(start+dur);};
    switch(type){
      case'bumper':n(280,t,.08,.12);n(180,t+.02,.06,.08);break;
      case'smBumper':n(420,t,.06,.10);n(320,t+.015,.04,.06);break;
      case'sling':n(600,t,.04,.08,'triangle');n(900,t+.005,.03,.06,'triangle');break;
      case'rail':n(800,t,.03,.04);break;
      case'spin':n(1100,t,.02,.06);break;
      case'post':n(500,t,.035,.07,'triangle');break;
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
    this.angle=0;this.spin=0;this.lastTouchedBy=null;this.pocketed=false;
  }
  reset(cw,ch,dir){
    this.x=cw/2;this.y=ch/2;this.prevX=this.x;this.prevY=this.y;this.speed=CONFIG.ballSpeedInitial;
    const ang=Math.random()*.8-.4;this.dx=Math.cos(ang)*this.speed*dir;this.dy=Math.sin(ang)*this.speed;
    this.angle=0;this.spin=0;this.lastTouchedBy=null;this.pocketed=false;
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
    this.multiBalls=[];this.poolObjBalls=[];this.poolRackSide=choosePoolRackSide();
    this.poolServeSide='left';this.poolMainRespawn=null;this.poolClackTick=0;
    this.pinballLayout=null;this.lastTime=0;this.accumulator=0;this.tickRate=1000/60;
    this._loop=this._loop.bind(this);this.ball.reset(CONFIG.canvasWidth,CONFIG.canvasHeight,0);this._loop(0);
  }

  start(){
    this._applySettings();this.active=true;this.paused=false;
    this.ai=settings.gameMode==='ai'?new AIOpponent(settings.difficulty):null;
    this._syncDimensions();this._resetGame();this.transition('serving');
  }
  restart(){this.paused=false;this._applyArenaDimensions();this._resetGame();this.transition('serving');}
  _applyArenaDimensions(){
    const isPin=settings.gameVariant==='pinball';
    const w=isPin?CONFIG.PINBALL_W:CONFIG.NORMAL_W;
    const h=isPin?CONFIG.PINBALL_H:CONFIG.NORMAL_H;
    if(CONFIG.canvasWidth===w&&CONFIG.canvasHeight===h)return;
    CONFIG.canvasWidth=w;CONFIG.canvasHeight=h;
    this.canvas.width=w;this.canvas.height=h;
    this.ball.prevX=this.ball.x=w/2;this.ball.prevY=this.ball.y=h/2;this.ball.dx=this.ball.dy=0;
    this.paddleLeft.x=CONFIG.paddleMargin;this.paddleLeft.y=h/2-45;
    this.paddleRight.x=w-CONFIG.paddleMargin-settings.paddleWidth;
    this.paddleRight.y=h/2-45;
    this.pinballLayout=isPin?createPinballLayout():null;
  }
  _applySettings(){this._applyThemeAndColors();if(settings.gameVariant!=='frenzy'){if(/^\d+ball$/.test(settings.ballSkin)&&settings.ballSkin!=='8ball')settings.ballSkin='8ball';this.ball.skin=settings.ballSkin;}applyThemeCSS(settings.theme);}
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
    if(settings.gameVariant==='pool'){
      const fb=getPoolBounds();
      this.paddleLeft.x=fb.left+POOL_CONFIG.paddleInset;
      this.paddleRight.x=fb.right-POOL_CONFIG.paddleInset-this.paddleRight.width;
      const safe=POOL_CONFIG.paddleVerticalSafety;
      const minY=fb.top+safe, maxY=fb.bottom-safe-this.paddleLeft.height;
      this.paddleLeft.y=Math.max(minY,Math.min(maxY,this.paddleLeft.y));
      this.paddleRight.y=Math.max(minY,Math.min(maxY,this.paddleRight.y));
    }else{
      this.paddleLeft.x=CONFIG.paddleMargin-settings.paddleWidth/2;
      this.paddleRight.x=CONFIG.canvasWidth-CONFIG.paddleMargin-settings.paddleWidth/2;
    }
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
    this.poolObjBalls=[];this.poolRackSide=choosePoolRackSide();this.poolServeSide='left';this.poolMainRespawn=null;this.poolClackTick=0;
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
    if(newState==='serving'){
      this.paddleLeft.reset(CONFIG.canvasHeight);this.paddleRight.reset(CONFIG.canvasHeight);
      this.ball.reset(CONFIG.canvasWidth,CONFIG.canvasHeight,this.serveDirection);
      this.multiBalls=[];
      if(settings.gameVariant==='frenzy')this._spawnFrenzyBalls();
      // Pool Mode: rack + side-spawn
      if(settings.gameVariant==='pool'){
        if(this.poolMainRespawn){
          // Main ball only respawn — independent 50/50 serve side
          this.poolServeSide=Math.random()<0.5?'left':'right';
          const sp=poolMainBallSpawn(this.poolServeSide,this.paddleLeft,this.paddleRight,this.ball.size);
          this.ball.x=sp.x;this.ball.y=sp.y;this.ball.prevX=sp.x;this.ball.prevY=sp.y;
          this.ball.dx=this.ball.dy=0;this.ball.spin=0;this.ball.angle=0;
          launchRespawnPoolMainBall(this.ball,this.poolServeSide,this.poolObjBalls);
          this.ball.lastTouchedBy=this.poolServeSide;
          this.poolMainRespawn=null;
        }else{
          // Full rack: create new object balls
          this.poolRackSide=choosePoolRackSide();
          this.poolObjBalls=createPoolObjectBalls(this.poolRackSide);
          // Spawn main ball opposite side
          this.poolServeSide=this.poolRackSide==='right'?'left':'right';
          const sp=poolMainBallSpawn(this.poolServeSide,this.paddleLeft,this.paddleRight,this.ball.size);
          this.ball.x=sp.x;this.ball.y=sp.y;this.ball.prevX=sp.x;this.ball.prevY=sp.y;
          this.ball.dx=this.ball.dy=0;this.ball.spin=0;this.ball.angle=0;
          launchFreshPoolBreak(this.ball,this.poolRackSide);
          this.ball.lastTouchedBy=this.poolServeSide;
        }
      }
    }
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
    const ch=settings.gameVariant==='pool'?getPoolBounds().bottom:CONFIG.canvasHeight;
    this.paddleLeft.update(ch);
    if(this.ai){this.ai.update(this.paddleRight,[this.ball,...this.multiBalls],ch);if(this.puEffects.rSlow>0)this.paddleRight.vy*=.4;}
    this.paddleRight.update(ch);
    if(settings.gameVariant==='pool'){this._updatePoolMode();return;}
    if(settings.gameVariant==='pinball'){this._updatePinballMode();return;}
    // original normal/frenzy/powerups ball processing
    this.ball.update();
    for(const b of this.multiBalls)b.update();
    for(const b of this.multiBalls)this._ballCollision(this.ball,b);
    for(let i=0;i<this.multiBalls.length;i++)
      for(let j=i+1;j<this.multiBalls.length;j++)this._ballCollision(this.multiBalls[i],this.multiBalls[j]);
    if(this._checkBall(this.ball)&&this.multiBalls.length>0){const b=this.multiBalls.pop();this.ball.x=b.x;this.ball.y=b.y;this.ball.prevX=b.x;this.ball.prevY=b.y;this.ball.dx=b.dx;this.ball.dy=b.dy;this.ball.speed=b.speed;this.ball.spin=b.spin;this.ball.angle=b.angle;this.ball.skin=b.skin;this.ball.color=b.color;}
    for(let i=this.multiBalls.length-1;i>=0;i--){if(this._checkBall(this.multiBalls[i]))this.multiBalls.splice(i,1);}
  }

  /* ---- POOL MODE: full update with object balls ---- */
  _updatePoolMode(){
    const objs=this.poolObjBalls,main=this.ball;
    if(main.pocketed){this._poolUpdateObjBalls(objs);return;}
    // Main ball update
    main.update();
    this._poolPaddleCollision(main);
    // Object ball update + substeps
    this._poolUpdateObjBalls(objs);
    // Ball-to-ball collisions (main↔objects + objects↔objects)
    for(const ob of objs){if(!ob.active||ob.pocketed)continue;this._poolPairCollision(main,ob,true);}
    for(let i=0;i<objs.length;i++){if(!objs[i].active||objs[i].pocketed)continue;for(let j=i+1;j<objs.length;j++){if(!objs[j].active||objs[j].pocketed)continue;this._poolPairCollision(objs[i],objs[j],false);}}
    // Pocket checks (before rail)
    const mp=checkPoolPocketHit(main);
    if(mp&&!main.pocketed){this._poolHandleMainPocket(mp);return;}
    for(const ob of objs){
      if(!ob.active||ob.pocketed||ob.animTimer>0)continue;
      const p=checkPoolPocketHit(ob);
      if(p){this._poolHandleObjPocket(ob,p);}
    }
    // Rail collisions
    this._resolvePoolRails(main);
    for(const ob of objs){if(!ob.active||ob.pocketed)continue;this._poolObjRail(ob);}
    // Object paddle collisions
    if(!main.pocketed){for(const ob of objs){if(!ob.active||ob.pocketed)continue;this._poolObjPaddle(ob);}}
    // Check if all object balls cleared
    if(objs.length>0&&objs.every(b=>b.pocketed||!b.active)){
      this.poolObjBalls=[];this.poolRackSide=choosePoolRackSide();this.transition('serving');
    }
    this._poolFlushClacks();
  }

  _poolUpdateObjBalls(objs){
    for(const ob of objs){
      if(!ob.active||ob.pocketed){if(ob.animTimer>0){ob.animTimer--;if(ob.animTimer<=0)ob.active=false;}continue;}
      ob.prevX=ob.x;ob.prevY=ob.y;
      ob.x+=ob.vx;ob.y+=ob.vy;
      // Visual rolling rotation
      const trav=Math.hypot(ob.x-ob.prevX,ob.y-ob.prevY);
      ob.angle+=Math.sign(ob.vx||ob.vy||1)*trav/ob.radius*POOL_SPIN.visualRoll+ob.spin;
      // Friction
      const spd=Math.hypot(ob.vx,ob.vy);
      if(spd<POOL_RACK.stopSpeed&&Math.abs(ob.spin)<POOL_SPIN.spinStop){ob.vx=0;ob.vy=0;ob.spin=0;ob.sleeping=true;}
      else{ob.sleeping=false;const f=POOL_RACK.frictionPerTick;ob.vx*=f;ob.vy*=f;ob.spin*=POOL_SPIN.objDamping;}
    }
  }

  _poolPaddleCollision(b){
    const bw=b.size/2,pL=this.paddleLeft,pR=this.paddleRight;
    if(b.dx<0&&b.x-bw<=pL.x+pL.width&&b.x-bw>=pL.x&&b.y+bw>=pL.y&&b.y-bw<=pL.y+pL.height){this._hitBall(b,pL,1);b.lastTouchedBy='left';}
    if(b.dx>0&&b.x+bw>=pR.x&&b.x+bw<=pR.x+pR.width&&b.y+bw>=pR.y&&b.y-bw<=pR.y+pR.height){this._hitBall(b,pR,-1);b.lastTouchedBy='right';}
  }

  _poolPairCollision(a,b,mainInvolved){
    // Reset clack counter each tick via poolClackTick
    const ra=a.radius!==undefined?a.radius:a.size/2;
    const rb=b.radius!==undefined?b.radius:b.size/2;
    const dx=b.x-a.x,dy=b.y-a.y,dist=Math.hypot(dx,dy),min=ra+rb;
    if(dist>=min||dist<0.001)return;
    // Save main ball speed before impulse
    let savedSpeed=0;
    if(mainInvolved){savedSpeed=Math.hypot(a.dx,a.dy);if(!Number.isFinite(savedSpeed)||savedSpeed<0.0001)savedSpeed=a.speed||CONFIG.ballSpeedInitial;}
    const nx=dx/dist,ny=dy/dist,overlap=min-dist;
    a.x-=nx*overlap*rb/(ra+rb);a.y-=ny*overlap*rb/(ra+rb);
    b.x+=nx*overlap*ra/(ra+rb);b.y+=ny*overlap*ra/(ra+rb);
    const avx=a.vx!==undefined?a.vx:a.dx,avy=a.vy!==undefined?a.vy:a.dy;
    const bvx=b.vx!==undefined?b.vx:b.dx,bvy=b.vy!==undefined?b.vy:b.dy;
    const rv=(avx-bvx)*nx+(avy-bvy)*ny;if(rv<=0){if(mainInvolved)this._poolRestoreSpeed(a,savedSpeed);return;}
    const ma=ra*ra,mb=rb*rb,tm=ma+mb,imp=rv*(1+POOL_RACK.restitution)/tm;
    if(a.vx!==undefined){a.vx-=imp*mb*nx;a.vy-=imp*mb*ny;}else{a.dx-=imp*mb*nx;a.dy-=imp*mb*ny;}
    if(b.vx!==undefined){b.vx+=imp*ma*nx;b.vy+=imp*ma*ny;}else{b.dx+=imp*ma*nx;b.dy+=imp*ma*ny;}
    // Restore main ball speed after impulse
    if(mainInvolved)this._poolRestoreSpeed(a,savedSpeed);
    // Spin transfer (tangential)
    const avx2=a.vx!==undefined?a.vx:a.dx,avy2=a.vy!==undefined?a.vy:a.dy;
    const bvx2=b.vx!==undefined?b.vx:b.dx,bvy2=b.vy!==undefined?b.vy:b.dy;
    const tx=-ny,ty=nx;
    const atv=avx2*tx+avy2*ty,btv=bvx2*tx+bvy2*ty;
    const rtv=atv-btv+(a.spin!==undefined?a.spin*ra:0)+(b.spin!==undefined?b.spin*rb:0);
    const spinImp=Math.abs(rtv)*POOL_SPIN.ballFriction;
    if(spinImp>1e-6){
      if(a.spin!==undefined){a.spin+=spinImp*POOL_SPIN.ballSpinTransfer/rb;a.spin=Math.max(-POOL_SPIN.maxObjSpin,Math.min(POOL_SPIN.maxObjSpin,a.spin));}
      else{a.spin+=spinImp*POOL_SPIN.ballSpinTransfer/ra;a.spin=Math.max(-POOL_SPIN.maxMainSpin,Math.min(POOL_SPIN.maxMainSpin,a.spin));}
      if(b.spin!==undefined){b.spin-=spinImp*POOL_SPIN.ballSpinTransfer/ra;b.spin=Math.max(-POOL_SPIN.maxObjSpin,Math.min(POOL_SPIN.maxObjSpin,b.spin));}
      else{b.spin-=spinImp*POOL_SPIN.ballSpinTransfer/rb;b.spin=Math.max(-POOL_SPIN.maxMainSpin,Math.min(POOL_SPIN.maxMainSpin,b.spin));}
    }
    // Clack sound
    if(settings.soundEnabled&&Math.abs(rv)>POOL_SOUND.minClack)this._poolQueueClack(Math.abs(rv));
    // Ownership
    const mag=Math.abs(rv);
    if(mainInvolved&&mag>=POOL_RACK.breakThreshold&&this.ball.lastTouchedBy){b.lastInfluencedBy=this.ball.lastTouchedBy;}
    if(!mainInvolved&&mag>=POOL_RACK.ownershipThreshold){if(a.lastInfluencedBy&&!b.lastInfluencedBy)b.lastInfluencedBy=a.lastInfluencedBy;else if(!a.lastInfluencedBy&&b.lastInfluencedBy)a.lastInfluencedBy=b.lastInfluencedBy;}
    if(b.sleeping)b.sleeping=false;
    if(a.sleepTimer!==undefined)a.sleepTimer=0;if(b.sleepTimer!==undefined)b.sleepTimer=0;
  }

  _poolRestoreSpeed(main,savedSpeed){
    const post=Math.hypot(main.dx,main.dy);
    if(post>0.0001){const s=savedSpeed/post;main.dx*=s;main.dy*=s;}
    else{main.dx=savedSpeed*(main.dx>=0?1:-1)||savedSpeed;main.dy=0;}
    main.speed=Math.hypot(main.dx,main.dy);
  }

  /** Main ball rail collisions with pocket openings */
  _resolvePoolRails(b){
    const br=b.size/2,fb=getPoolBounds();
    if(b.y-br<=fb.top&&!isInsideTopPoolPocketOpening(b.x,br)){b.y=fb.top+br;if(b.dy<0)b.dy=Math.abs(b.dy);b.prevY=b.y;}
    if(b.y+br>=fb.bottom&&!isInsideBottomPoolPocketOpening(b.x,br)){b.y=fb.bottom-br;if(b.dy>0)b.dy=-Math.abs(b.dy);b.prevY=b.y;}
    if(b.x-br<=fb.left&&!isInsideLeftPoolPocketOpening(b.y,br)){b.x=fb.left+br;if(b.dx<0)b.dx=Math.abs(b.dx);b.prevX=b.x;}
    if(b.x+br>=fb.right&&!isInsideRightPoolPocketOpening(b.y,br)){b.x=fb.right-br;if(b.dx>0)b.dx=-Math.abs(b.dx);b.prevX=b.x;}
    b.x=Math.max(fb.left+br,Math.min(fb.right-br,b.x));
    b.y=Math.max(fb.top+br,Math.min(fb.bottom-br,b.y));
  }

  _poolObjRail(ob){
    const r=ob.radius,fb=getPoolBounds();
    if(ob.y-r<=fb.top&&!isInsideTopPoolPocketOpening(ob.x,r)){ob.y=fb.top+r;if(ob.vy<0)ob.vy*=-POOL_RACK.railBounce;ob.vx+=ob.spin*r*POOL_SPIN.railSpinTransfer;ob.spin*=POOL_SPIN.railSpinRetention;ob.prevY=ob.y;}
    if(ob.y+r>=fb.bottom&&!isInsideBottomPoolPocketOpening(ob.x,r)){ob.y=fb.bottom-r;if(ob.vy>0)ob.vy*=-POOL_RACK.railBounce;ob.vx-=ob.spin*r*POOL_SPIN.railSpinTransfer;ob.spin*=POOL_SPIN.railSpinRetention;ob.prevY=ob.y;}
    if(ob.x-r<=fb.left&&!isInsideLeftPoolPocketOpening(ob.y,r)){ob.x=fb.left+r;if(ob.vx<0)ob.vx*=-POOL_RACK.railBounce;ob.vy-=ob.spin*r*POOL_SPIN.railSpinTransfer;ob.spin*=POOL_SPIN.railSpinRetention;ob.prevX=ob.x;}
    if(ob.x+r>=fb.right&&!isInsideRightPoolPocketOpening(ob.y,r)){ob.x=fb.right-r;if(ob.vx>0)ob.vx*=-POOL_RACK.railBounce;ob.vy+=ob.spin*r*POOL_SPIN.railSpinTransfer;ob.spin*=POOL_SPIN.railSpinRetention;ob.prevX=ob.x;}
    ob.x=Math.max(fb.left+r,Math.min(fb.right-r,ob.x));ob.y=Math.max(fb.top+r,Math.min(fb.bottom-r,ob.y));
  }

  _poolObjPaddle(ob){
    for(const[s,p]of[['left',this.paddleLeft],['right',this.paddleRight]]){
      const cx=Math.max(p.x,Math.min(ob.x,p.x+p.width)),cy=Math.max(p.y,Math.min(ob.y,p.y+p.height));
      const dx=ob.x-cx,dy=ob.y-cy,dist=Math.hypot(dx,dy);
      if(dist>=ob.radius||dist<0.001)continue;
      const nx=dx/dist,ny=dy/dist;
      ob.x+=nx*(ob.radius-dist);ob.y+=ny*(ob.radius-dist);
      const rv=ob.vx*nx+ob.vy*ny-p.vy*ny;if(rv>0)continue;
      ob.vx-=rv*nx*2*POOL_RACK.paddleRestitution;ob.vy-=rv*ny*2*POOL_RACK.paddleRestitution;
      ob.lastInfluencedBy=s;ob.sleeping=false;
      // Paddle spin
      const pc=p.y+p.height/2,no=(ob.y-pc)/(p.height/2);
      ob.spin+=Math.max(-1,Math.min(1,no))*Math.hypot(ob.vx,ob.vy)*POOL_SPIN.paddleSpin+p.vy*POOL_SPIN.paddleVelSpin;
      ob.spin=Math.max(-POOL_SPIN.maxObjSpin,Math.min(POOL_SPIN.maxObjSpin,ob.spin));

    }
  }

  _poolHandleObjPocket(ob,p){
    if(ob.animTimer>0)return;
    ob.pocketed=true;ob.vx=0;ob.vy=0;ob.pocketTarget={x:p.x,y:p.y};ob.animTimer=POOL_RACK.animTicks;
    if(settings.soundEnabled)this.sound.play('paddle');
    if(ob.lastInfluencedBy==='left'){this.paddleLeft.score++;const w=this._checkWin();if(w){this.winMessage='PLAYER '+w+' WINS!';this.state='over';}}
    else if(ob.lastInfluencedBy==='right'){this.paddleRight.score++;const w=this._checkWin();if(w){this.winMessage='PLAYER '+w+' WINS!';this.state='over';}}
  }

  _poolHandleMainPocket(pocket){
    const b=this.ball;
    b.pocketed=true;b.dx=0;b.dy=0;b.spin=0;b.x=pocket.x;b.y=pocket.y;
    if(settings.soundEnabled)this.sound.play('paddle');
    if(settings.effectsEnabled&&b.color){for(let i=0;i<12;i++)this.particles.push(new Particle(pocket.x,pocket.y,b.color));}
    if(b.lastTouchedBy==='left'){this.paddleLeft.score++;}
    else if(b.lastTouchedBy==='right'){this.paddleRight.score++;}
    const w=this._checkWin();
    if(w){this.winMessage='PLAYER '+w+' WINS!';this.state='over';if(settings.soundEnabled)this.sound.play('win');return;}
    this.poolMainRespawn=true;this.transition('serving');
  }

  _poolQueueClack(strength){
    if(!this.poolClackQueue)this.poolClackQueue=[];
    if(this.poolClackQueue.length>=POOL_SOUND.maxPerTick)return;
    this.poolClackQueue.push(Math.min(1,strength/POOL_SOUND.fullVol));
  }
  _poolFlushClacks(){
    if(!this.poolClackQueue||!this.poolClackQueue.length)return;
    const q=this.poolClackQueue.sort((a,b)=>b-a).slice(0,POOL_SOUND.maxPerTick);
    this.poolClackQueue=[];
    for(const s of q){
      if(!settings.soundEnabled)break;
      this.sound.playPoolClack(s);
    }
  }
  _poolResetClacks(){this.poolClackQueue=[];}

  /* ---- PINBALL MODE ---- */
  _ensurePinballLayout(){if(!this.pinballLayout)this.pinballLayout=createPinballLayout();}
  _resetPinballState(){
    if(!this.pinballLayout)return;
    for(const b of this.pinballLayout.bumpers){b.cooldown=0;b.flash=0;}
    for(const s of this.pinballLayout.slingshots){s.cooldown=0;s.flash=0;}
    for(const p of this.pinballLayout.posts){p.cooldown=0;p.flash=0;}
    if(this.pinballLayout.kickers)for(const k of this.pinballLayout.kickers){k.cooldown=0;k.flash=0;}
    for(const sp of this.pinballLayout.spinners){sp.av=sp.baseAv;}
  }
  _updatePinballMode(){
    this._ensurePinballLayout();
    const L=this.pinballLayout,ball=this.ball;
    // Update spinner rotation
    if(!this.paused){for(const s of L.spinners){s.angle+=s.av;s.av=s.av*PINBALL.spinnerFric+s.baseAv*(1-PINBALL.spinnerFric);}}
    // Move ball
    ball.prevX=ball.x;ball.prevY=ball.y;
    const dt=this.tickRate/1000*.016; // approx per-tick delta
    const spd=Math.hypot(ball.dx,ball.dy);
    const br=ball.size/2;
    const subs=Math.min(8,Math.max(1,Math.ceil(spd*dt/(br*PINBALL.substepRatio))));
    const stepDx=ball.dx/subs,stepDy=ball.dy/subs;
    for(let s=0;s<subs;s++){
      ball.x+=stepDx;ball.y+=stepDy;
      // Paddle collision
      this._hitBallPaddles(ball);
      // Bumpers
      for(const b of L.bumpers){
        const dist=Math.hypot(ball.x-b.x,ball.y-b.y),min=br+b.r;
        if(dist>=min||dist<.001)continue;
        const nx=(ball.x-b.x)/dist,ny=(ball.y-b.y)/dist;
        ball.x=b.x+nx*min;ball.y=b.y+ny*min;
        const dot=ball.dx*nx+ball.dy*ny;if(dot>=0)continue;
        ball.dx-=2*dot*nx;ball.dy-=2*dot*ny;
        const rest=b.type==='large'?PINBALL.largeRestitution:PINBALL.mediumRestitution;
        const ns=Math.min(PINBALL.maxSpeed,spd*rest+PINBALL.bumperBoost);
        const nm=Math.hypot(ball.dx,ball.dy);if(nm>.001){ball.dx=ball.dx/nm*ns;ball.dy=ball.dy/nm*ns;}
        ball.speed=ns;
        if(b.cooldown<=0&&settings.soundEnabled)this.sound.playPinballSound(b.type==='large'?'bumper':'smBumper');
        if(settings.effectsEnabled&&b.cooldown<=0){for(let i=0;i<6;i++)this.particles.push(new Particle(b.x,b.y,'#ffcc00'));}
        b.cooldown=b.type==='large'?PINBALL.bCooldown:PINBALL.bCooldown;
        b.flash=PINBALL.bFlash;
      }
      // Kickers (if present)
      if(L.kickers){for(const k of L.kickers){
        const dist=Math.hypot(ball.x-k.x,ball.y-k.y),min=br+k.r;
        if(dist>=min||dist<.001)continue;
        const nx=(ball.x-k.x)/dist,ny=(ball.y-k.y)/dist;
        ball.x=k.x+nx*min;ball.y=k.y+ny*min;
        const dot=ball.dx*nx+ball.dy*ny;if(dot>=0)continue;
        ball.dx-=2*dot*nx;ball.dy-=2*dot*ny;
        const ns=Math.min(PINBALL.maxSpeed,spd*1.08+.2);
        const nm=Math.hypot(ball.dx,ball.dy);if(nm>.001){ball.dx=ball.dx/nm*ns;ball.dy=ball.dy/nm*ns;}
        ball.speed=ns;
        if(k.cooldown<=0&&settings.soundEnabled)this.sound.playPinballSound('bumper');
        k.cooldown=PINBALL.bCooldown;k.flash=9;
      }}
      // Posts
      for(const p of L.posts){
        const dist=Math.hypot(ball.x-p.x,ball.y-p.y),min=br+p.r;
        if(dist>=min||dist<.001)continue;
        const nx=(ball.x-p.x)/dist,ny=(ball.y-p.y)/dist;
        ball.x=p.x+nx*min;ball.y=p.y+ny*min;
        const dot=ball.dx*nx+ball.dy*ny;if(dot>=0)continue;
        ball.dx-=2*dot*nx;ball.dy-=2*dot*ny;
        if(p.cooldown<=0&&settings.soundEnabled)this.sound.playPinballSound('post');
        p.cooldown=PINBALL.pCooldown;p.flash=PINBALL.bFlash;
      }
      // Slingshots
      for(const sl of L.slingshots){
        const a=sl.a;
        for(let i=0;i<3;i++){
          const p1=a[i],p2=a[(i+1)%3];
          const dx=p2.x-p1.x,dy=p2.y-p1.y,len=Math.hypot(dx,dy);
          if(len<.001)continue;
          const nx=dx/len,ny=dy/len;
          const t=Math.max(0,Math.min(1,((ball.x-p1.x)*nx+(ball.y-p1.y)*ny)/len));
          const cx=p1.x+nx*t*len,cy=p1.y+ny*t*len;
          const dist=Math.hypot(ball.x-cx,ball.y-cy),thick=4;
          if(dist>=br+thick)continue;
          const nnx=(ball.x-cx)/Math.max(.001,dist),nny=(ball.y-cy)/Math.max(.001,dist);
          ball.x+=nnx*(br+thick-dist);ball.y+=nny*(br+thick-dist);
          const dot=ball.dx*nnx+ball.dy*nny;if(dot>=0)continue;
          ball.dx-=2*dot*nnx;ball.dy-=2*dot*nny;
          if(sl.cooldown<=0&&settings.soundEnabled)this.sound.playPinballSound('sling');
          if(settings.effectsEnabled&&sl.cooldown<=0){for(let i=0;i<4;i++)this.particles.push(new Particle(cx,cy,'#ff6600'));}
          sl.cooldown=PINBALL.sCooldown;sl.flash=PINBALL.sFlash;
        }
      }
      // Rails
      for(const r of L.rails){
        const dx=r.x2-r.x1,dy=r.y2-r.y1,len=Math.hypot(dx,dy);
        if(len<.001)continue;
        const nx=dx/len,ny=dy/len;
        const t=Math.max(0,Math.min(1,((ball.x-r.x1)*nx+(ball.y-r.y1)*ny)/len));
        const cx=r.x1+nx*t*len,cy=r.y1+ny*t*len;
        const dist=Math.hypot(ball.x-cx,ball.y-cy),thick=5;
        if(dist>=br+thick)continue;
        const nnx=(ball.x-cx)/Math.max(.001,dist),nny=(ball.y-cy)/Math.max(.001,dist);
        ball.x+=nnx*(br+thick-dist);ball.y+=nny*(br+thick-dist);
        const dot=ball.dx*nnx+ball.dy*nny;if(dot>=0)continue;
        ball.dx-=2*dot*nnx;ball.dy-=2*dot*nny;
        if(Math.abs(dot)>.5&&settings.soundEnabled)this.sound.playPinballSound('rail');
      }
      // Spinners
      for(const sp of L.spinners){
        const hl=(sp.len||PINBALL.spinnerLen)/2;
        const ex1=sp.x+Math.cos(sp.angle)*hl,ey1=sp.y+Math.sin(sp.angle)*hl;
        const ex2=sp.x-Math.cos(sp.angle)*hl,ey2=sp.y-Math.sin(sp.angle)*hl;
        const dx=ex2-ex1,dy=ey2-ey1,len=Math.hypot(dx,dy);
        if(len<.001)continue;
        const nx=dx/len,ny=dy/len;
        const t=Math.max(0,Math.min(1,((ball.x-ex1)*nx+(ball.y-ey1)*ny)/len));
        const cx=ex1+nx*t*len,cy=ey1+ny*t*len;
        const dist=Math.hypot(ball.x-cx,ball.y-cy);
        if(dist>=br+4)continue;
        const nnx=(ball.x-cx)/Math.max(.001,dist),nny=(ball.y-cy)/Math.max(.001,dist);
        ball.x+=nnx*(br+4-dist);ball.y+=nny*(br+4-dist);
        const dot=ball.dx*nnx+ball.dy*nny;if(dot>=0)continue;
        ball.dx-=2*dot*nnx;ball.dy-=2*dot*nny;
        sp.av+=dot*PINBALL.spinnerTransfer/(hl);
        if(settings.soundEnabled)this.sound.playPinballSound('spin');
      }
      // Top/bottom wall bounce
      if(ball.y-br<=0){ball.y=br;ball.dy=Math.abs(ball.dy);}
      if(ball.y+br>=CONFIG.canvasHeight){ball.y=CONFIG.canvasHeight-br;ball.dy=-Math.abs(ball.dy);}
      // Goal check
      if(ball.x+br<0){this.paddleRight.score++;this.serveDirection=-1;this.transition('goal');return;}
      if(ball.x-br>CONFIG.canvasWidth){this.paddleLeft.score++;this.serveDirection=1;this.transition('goal');return;}
    }
    // Tick cooldowns
    for(const b of L.bumpers){if(b.cooldown>0)b.cooldown--;if(b.flash>0)b.flash--;}
    for(const s of L.slingshots){if(s.cooldown>0)s.cooldown--;if(s.flash>0)s.flash--;}
    for(const p of L.posts){if(p.cooldown>0)p.cooldown--;if(p.flash>0)p.flash--;}
    for(const k of L.kickers){if(k.cooldown>0)k.cooldown--;if(k.flash>0)k.flash--;}
    ball.speed=Math.hypot(ball.dx,ball.dy);
  }
  _hitBallPaddles(ball){
    const bw=ball.size/2,pL=this.paddleLeft,pR=this.paddleRight;
    if(ball.dx<0&&ball.x-bw<=pL.x+pL.width&&ball.x-bw>=pL.x&&ball.y+bw>=pL.y&&ball.y-bw<=pL.y+pL.height){this._hitBall(ball,pL,1);ball.lastTouchedBy='left';}
    if(ball.dx>0&&ball.x+bw>=pR.x&&ball.x+bw<=pR.x+pR.width&&ball.y+bw>=pR.y&&ball.y-bw<=pR.y+pR.height){this._hitBall(ball,pR,-1);ball.lastTouchedBy='right';}
  }
  _drawPinballArena(ctx,w,h,theme){
    const L=this.pinballLayout;
    // Dark playfield
    ctx.fillStyle='#101526';ctx.fillRect(0,0,w,h);
    // Frame
    ctx.strokeStyle='#3a3f4d';ctx.lineWidth=PINBALL.frameThickness;ctx.strokeRect(7,7,w-14,h-14);
    ctx.strokeStyle='#8992a8';ctx.lineWidth=2;ctx.strokeRect(7,7,w-14,h-14);
    // Symmetrical lane markings
    ctx.strokeStyle=theme.accent;ctx.globalAlpha=.15;ctx.lineWidth=1;
    ctx.setLineDash([4,8]);ctx.beginPath();ctx.moveTo(w/2,20);ctx.lineTo(w/2,h-20);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;
    // Bumpers
    for(const b of L.bumpers){
      const glow=b.flash>0?1+b.flash/PINBALL.bFlash*.5:1;
      ctx.fillStyle='#1a1a2e';ctx.beginPath();ctx.arc(b.x,b.y,b.r+2,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=b.type==='large'?'#c0392b':'#2980b9';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=theme.accent;ctx.lineWidth=2*glow;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.stroke();
      if(b.flash>0){ctx.fillStyle='rgba(255,255,255,'+(b.flash/PINBALL.bFlash*.4)+')';ctx.beginPath();ctx.arc(b.x,b.y,b.r+4,0,Math.PI*2);ctx.fill();}
      // 3 dots around
      for(let i=0;i<3;i++){const a=Math.PI*2/3*i;ctx.fillStyle=theme.accent;ctx.beginPath();ctx.arc(b.x+Math.cos(a)*(b.r+6),b.y+Math.sin(a)*(b.r+6),2,0,Math.PI*2);ctx.fill();}
    }
    // Posts
    for(const p of L.posts){
      ctx.fillStyle='#333';ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=theme.accent;ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.stroke();
    }
    // Slingshots
    for(const sl of L.slingshots){
      const glow=sl.flash>0?1+sl.flash/PINBALL.sFlash*.3:1;
      ctx.fillStyle='#1a1a2e';ctx.strokeStyle='#c0392b';ctx.lineWidth=3*glow;ctx.beginPath();
      ctx.moveTo(sl.a[0].x,sl.a[0].y);for(let i=1;i<3;i++)ctx.lineTo(sl.a[i].x,sl.a[i].y);ctx.closePath();ctx.fill();ctx.stroke();
      if(sl.flash>0){ctx.strokeStyle='rgba(255,150,0,'+(sl.flash/PINBALL.sFlash*.6)+')';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(sl.a[0].x,sl.a[0].y);for(let i=1;i<3;i++)ctx.lineTo(sl.a[i].x,sl.a[i].y);ctx.closePath();ctx.stroke();}
    }
    // Guide rails
    ctx.strokeStyle='#8992a8';ctx.lineWidth=5;ctx.lineCap='round';
    for(const r of L.rails){ctx.beginPath();ctx.moveTo(r.x1,r.y1);ctx.lineTo(r.x2,r.y2);ctx.stroke();}
    ctx.strokeStyle='#3a3f4d';ctx.lineWidth=7;ctx.lineCap='round';
    for(const r of L.rails){ctx.beginPath();ctx.moveTo(r.x1,r.y1);ctx.lineTo(r.x2,r.y2);ctx.stroke();}
    // Spinners
    for(const sp of L.spinners){
      const hl=(sp.len||PINBALL.spinnerLen)/2;
      const ex1=sp.x+Math.cos(sp.angle)*hl,ey1=sp.y+Math.sin(sp.angle)*hl;
      // Axle
      ctx.fillStyle=theme.accent;ctx.beginPath();ctx.arc(sp.x,sp.y,3,0,Math.PI*2);ctx.fill();
      // Bar
      ctx.strokeStyle='#8992a8';ctx.lineWidth=PINBALL.spinnerW;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(ex1,ey1);const ex2=sp.x-Math.cos(sp.angle)*hl,ey2=sp.y-Math.sin(sp.angle)*hl;ctx.lineTo(ex2,ey2);ctx.stroke();
      ctx.strokeStyle=theme.accent;ctx.lineWidth=PINBALL.spinnerW-2;ctx.beginPath();ctx.moveTo(ex1,ey1);ctx.lineTo(ex2,ey2);ctx.stroke();
    }
    // Kickers
    if(L.kickers){for(const k of L.kickers){
      const g=k.flash>0?1+k.flash/9*.4:1;
      ctx.fillStyle='#2a1040';ctx.beginPath();ctx.arc(k.x,k.y,k.r+3,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#8844cc';ctx.beginPath();ctx.arc(k.x,k.y,k.r,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=theme.accent;ctx.lineWidth=2*g;ctx.beginPath();ctx.arc(k.x,k.y,k.r,0,Math.PI*2);ctx.stroke();
    }}
    // Inner rails
    if(L.innerRails){ctx.strokeStyle='#8992a8';ctx.lineWidth=4;ctx.lineCap='round';
      for(const r of L.innerRails){ctx.beginPath();ctx.moveTo(r.x1,r.y1);ctx.lineTo(r.x2,r.y2);ctx.stroke();}
    }
    // Diamonds
    if(L.diamonds){for(const d of L.diamonds){
      ctx.fillStyle='#1a1a2e';ctx.strokeStyle='#c0392b';ctx.lineWidth=3;ctx.beginPath();
      ctx.moveTo(d.a[0].x,d.a[0].y);for(let i=1;i<d.a.length;i++)ctx.lineTo(d.a[i].x,d.a[i].y);ctx.closePath();ctx.fill();ctx.stroke();
    }}
    // Gates
    if(L.gates){for(const g of L.gates){
      const hlg=g.len/2,ex1=g.x+Math.cos(g.angle)*hlg,ey1=g.y+Math.sin(g.angle)*hlg;
      const ex2=g.x-Math.cos(g.angle)*hlg,ey2=g.y-Math.sin(g.angle)*hlg;
      ctx.strokeStyle='#8992a8';ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(ex1,ey1);ctx.lineTo(ex2,ey2);ctx.stroke();
      ctx.fillStyle=theme.accent;ctx.beginPath();ctx.arc(g.x,g.y,3,0,Math.PI*2);ctx.fill();
    }}
    // Lane markers
    if(L.lanes){for(const l of L.lanes){
      ctx.strokeStyle=theme.accent;ctx.globalAlpha=.2;ctx.lineWidth=2;ctx.setLineDash([3,6]);ctx.beginPath();
      ctx.moveTo(l.pts[0].x,l.pts[0].y);for(let i=1;i<l.pts.length;i++)ctx.lineTo(l.pts[i].x,l.pts[i].y);ctx.stroke();
      ctx.setLineDash([]);ctx.globalAlpha=1;
    }}
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
    // pool-mode paddle clamping
    if(settings.gameVariant==='pool'){
      const fb=getPoolBounds(),safe=POOL_CONFIG.paddleVerticalSafety;
      const mn=fb.top+safe,mx=fb.bottom-safe-this.paddleLeft.height;
      if(this.paddleLeft.y<mn)this.paddleLeft.y=mn;
      if(this.paddleLeft.y>mx)this.paddleLeft.y=mx;
      if(this.paddleRight.y<mn)this.paddleRight.y=mn;
      if(this.paddleRight.y>mx)this.paddleRight.y=mx;
    }
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

    // ---- POOL TABLE / PINBALL / NORMAL ARENA ----
    if(settings.gameVariant==='pool')this._drawPoolTable(ctx,w,h,theme);
    else if(settings.gameVariant==='pinball'){this._ensurePinballLayout();this._drawPinballArena(ctx,w,h,theme);}
    else{
      ctx.strokeStyle=theme.centerLine;ctx.lineWidth=2;
      switch(theme.lineStyle){case'dashed':ctx.setLineDash([8,12]);break;case'dotted':ctx.setLineDash([3,8]);break;default:ctx.setLineDash([]);}
      ctx.beginPath();ctx.moveTo(w/2,0);ctx.lineTo(w/2,h);ctx.stroke();ctx.setLineDash([]);
    }
    // ---- paddles, balls, effects (shared) ----
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
    // pool object balls
    if(settings.gameVariant==='pool'){for(const ob of this.poolObjBalls){if(!ob.active)continue;const s=ob.radius*2;if(ob.animTimer>0){const t=1-ob.animTimer/POOL_RACK.animTicks;ctx.save();ctx.globalAlpha=t;BallRenderer.draw(ctx,ob.pocketTarget?ob.pocketTarget.x:ob.x,ob.pocketTarget?ob.pocketTarget.y:ob.y,s*t,'#ffffff',ob.skin,0);ctx.restore();}else{ctx.save();ctx.translate(ob.x,ob.y);ctx.rotate(ob.angle||0);ctx.translate(-ob.x,-ob.y);BallRenderer.draw(ctx,ob.x,ob.y,s,'#ffffff',ob.skin,0);ctx.restore();}}}
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

  /** Draw the pool table arena: outer frame, wooden rails, green felt, 6 pockets */
  _drawPoolTable(ctx,w,h,theme){
    const t=POOL_CONFIG.railThickness;
    const b=getPoolBounds();
    // === outer table frame ===
    ctx.fillStyle='#1a0a05';ctx.fillRect(0,0,w,h);
    // === wooden rails ===
    ctx.fillStyle=POOL_CONFIG.railColor;
    ctx.fillRect(0,0,w,t);                          // top rail
    ctx.fillRect(0,h-t,w,t);                        // bottom rail
    ctx.fillRect(0,0,t,h);                          // left rail
    ctx.fillRect(w-t,0,t,h);                        // right rail
    // rail inner highlight
    ctx.strokeStyle='#8a3d33';ctx.lineWidth=2;
    ctx.strokeRect(t-1,t-1,w-2*t+2,h-2*t+2);
    // === green felt ===
    ctx.fillStyle=POOL_CONFIG.feltColor;
    ctx.fillRect(b.left,b.top,b.width,b.height);
    // felt dark border
    ctx.strokeStyle=POOL_CONFIG.feltDarkColor;ctx.lineWidth=3;
    ctx.strokeRect(b.left,b.top,b.width,b.height);
    // === pockets ===
    const pockets=getPoolPockets();
    for(const p of pockets){
      // outer rim
      ctx.fillStyle='#1a0a05';
      ctx.beginPath();ctx.arc(p.x,p.y,p.visualRadius+4,0,Math.PI*2);ctx.fill();
      // rim highlight
      ctx.strokeStyle='#5a2a22';ctx.lineWidth=1.5;
      ctx.beginPath();ctx.arc(p.x,p.y,p.visualRadius+2,0,Math.PI*2);ctx.stroke();
      // pocket interior (dark center)
      ctx.fillStyle=POOL_CONFIG.pocketColor;
      ctx.beginPath();ctx.arc(p.x,p.y,p.visualRadius*.7,0,Math.PI*2);ctx.fill();
    }
    // === felt center circle (decorative) ===
    ctx.strokeStyle=POOL_CONFIG.feltDarkColor;ctx.lineWidth=1.5;ctx.globalAlpha=.15;
    ctx.beginPath();ctx.arc(w/2,h/2,Math.min(b.width,b.height)*.15,0,Math.PI*2);ctx.stroke();
    ctx.globalAlpha=1;
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
      // hide numbered billiard skins except 8-ball (Pool Mode uses these internally)
      if(/^\d+ball$/.test(key)&&key!=='8ball')continue;
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
      case'play':this.game._applyArenaDimensions();this.startGame();break;
      case'toggle-gamemode':
        settings.gameVariant=settings.gameVariant==='classic'?'powerups':settings.gameVariant==='powerups'?'frenzy':settings.gameVariant==='frenzy'?'pool':settings.gameVariant==='pool'?'pinball':'classic';
        this.game._applyArenaDimensions();document.getElementById('gameModeLabel').textContent=settings.gameVariant==='classic'?'CLASSIC':settings.gameVariant==='frenzy'?'FRENZY':settings.gameVariant==='pool'?'POOL':settings.gameVariant==='pinball'?'PINBALL':'POWER UPS';break;
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
      case'paint-delete':this.paintEditor&&this.paintEditor.deleteSelected();break;
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
      cv.addEventListener('pointerup',e=>this.paintEditor.onPointerUp());
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
      document.getElementById('paintShading').checked=b?!!b.shading:false;
      if(b)this._paintLoadSrc(b.src);else this.paintEditor.clear();
    }else if(mode==='builtin'){
      const lbl=(BALL_SKINS.find(s=>s.key===target)||{}).label||target;
      nameField.value=lbl;nameField.disabled=true;   // built-in keeps its name
      const ov=CustomBallRegistry.getOverride(target);
      document.getElementById('paintShading').checked=ov?!!ov.shading:false;
      if(ov)this._paintLoadSrc(ov.src);        // continue editing existing override
      else this.paintEditor.loadBall(target);  // start from the procedural ball
    }else{
      nameField.disabled=false;nameField.value='';
      document.getElementById('paintShading').checked=false;
      this.paintEditor.clear();
    }
    this._showSub(this.menuBallPaint);
  }

  /** Load an image data URL onto the paint canvas */
  _paintLoadSrc(src){
    this.paintEditor.loadImageSrc(src);
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
    const shading=document.getElementById('paintShading').checked;
    if(this._paintMode==='builtin'){
      CustomBallRegistry.setOverride(this._paintBuiltinKey,src,shading);
    }else if(this._paintMode==='custom'){
      const name=document.getElementById('paintName').value.trim();
      if(!name){alert('ENTER A NAME');return;}
      CustomBallRegistry.update(this._paintEditingId,name,src,shading);
    }else{
      const name=document.getElementById('paintName').value.trim();
      if(!name){alert('ENTER A NAME');return;}
      CustomBallRegistry.add(name,src,shading);
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
    document.getElementById('gameModeLabel').textContent=settings.gameVariant==='classic'?'CLASSIC':settings.gameVariant==='frenzy'?'FRENZY':settings.gameVariant==='pool'?'POOL':'POWER UPS';
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
