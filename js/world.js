/* WORLD: 쯔꾸르식 타일 이동 */
(()=>{
const SPRITE='assets/player.png';
const T=20, CW=20, CH=27;               // 타일 크기 / 스프라이트 칸 크기
const MAP=[                              // # 벽  L 가로등  B 벤치  C 상자  . 바닥
 '################',
 '#..............#',
 '#..L.......B...#',
 '#..............#',
 '#......CC......#',
 '#......C.......#',
 '#..............#',
 '#.L..........L.#',
 '#..............#',
 '################'];
const W=MAP[0].length, H=MAP.length;
const $=s=>document.querySelector(s);
const cv=$('#world'), ctx=cv.getContext('2d');
cv.width=W*T; cv.height=H*T;
const img=new Image(); img.src=SPRITE;

/* 시트의 열 = 방향. 방향이 반대로 보이면 left/right 숫자만 서로 바꾸면 된다 */
const COL={down:0,left:1,up:2,right:3};
const VEC={down:[0,1],left:[-1,0],up:[0,-1],right:[1,0]};
const KEY={ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowUp:'up',KeyW:'up',ArrowRight:'right',KeyD:'right'};

/* 입력 (e.code 기준이라 한글 입력 상태에서도 WASD가 동작한다) */
const held=[]; let shift=false;
addEventListener('keydown',e=>{
  if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if(e.key==='Shift') shift=true;
  const d=KEY[e.code]; if(!d) return;
  e.preventDefault(); if(!held.includes(d)) held.push(d);
});
addEventListener('keyup',e=>{
  if(e.key==='Shift') shift=false;
  const d=KEY[e.code]; if(d){const i=held.indexOf(d); if(i>-1) held.splice(i,1);}
});
addEventListener('blur',()=>{held.length=0; shift=false;});

/* 플레이어 */
const p={x:7,y:6,tx:7,ty:6,t:0,moving:false,dir:'down',anim:0};
const solid=(x,y)=>x<0||y<0||x>=W||y>=H||MAP[y][x]!=='.';

function update(dt){
  let left=(shift?6.5:4)*dt;            // 초당 타일 수
  while(left>0){
    if(!p.moving){
      const d=held[held.length-1];
      if(!d){p.anim=0;break;}
      p.dir=d;                           // 막혀 있어도 방향은 바뀐다
      const [vx,vy]=VEC[d];
      if(solid(p.x+vx,p.y+vy)){p.anim=0;break;}
      p.tx=p.x+vx; p.ty=p.y+vy; p.t=0; p.moving=true;
    }
    const use=Math.min(left,1-p.t);
    p.t+=use; p.anim+=use; left-=use;
    if(p.t>=1-1e-9){p.x=p.tx; p.y=p.ty; p.t=0; p.moving=false;}
  }
}

/* 그리기 */
function drawFloor(x,y){
  ctx.fillStyle=(x+y)%2?'#8a8a86':'#848480'; ctx.fillRect(x*T,y*T,T,T);
  ctx.fillStyle='#6f6f6b'; ctx.fillRect(x*T+9,y*T+9,2,2);
}
function drawWall(x,y){
  const X=x*T,Y=y*T;
  ctx.fillStyle='#2e2e32'; ctx.fillRect(X,Y,T,T);
  ctx.fillStyle='#3d3d42'; ctx.fillRect(X,Y,T,2);
  ctx.fillStyle='#1c1c20'; ctx.fillRect(X,Y+T-2,T,2);
  ctx.fillRect(X,Y+9,T,1); ctx.fillRect(X+(y%2?5:13),Y,1,9); ctx.fillRect(X+(y%2?13:5),Y+10,1,8);
}
function drawObj(c,x,y){
  const X=x*T,Y=y*T;
  if(c==='L'){
    ctx.fillStyle='#222'; ctx.fillRect(X+9,Y-14,2,34);
    ctx.fillStyle='#f1f1ee'; ctx.fillRect(X+5,Y-18,10,5);
    ctx.fillStyle='#111'; ctx.fillRect(X+4,Y+17,12,3);
  }else if(c==='B'){
    ctx.fillStyle='#111'; ctx.fillRect(X+1,Y+6,18,3); ctx.fillRect(X+2,Y+9,2,8); ctx.fillRect(X+16,Y+9,2,8);
    ctx.fillStyle='#555'; ctx.fillRect(X+1,Y+4,18,3);
  }else if(c==='C'){
    ctx.fillStyle='#111'; ctx.fillRect(X+1,Y+3,18,17);
    ctx.fillStyle='#6b6b66'; ctx.fillRect(X+2,Y+4,16,15);
    ctx.fillStyle='#111'; ctx.fillRect(X+2,Y+11,16,1); ctx.fillRect(X+9,Y+4,2,15);
  }
}
function draw(){
  for(let y=0;y<H;y++)for(let x=0;x<W;x++) MAP[y][x]==='#'?drawWall(x,y):drawFloor(x,y);

  /* 물체와 플레이어를 발 위치(y) 순서로 그려서 앞뒤 가림이 자연스럽게 */
  const items=[];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const c=MAP[y][x]; if(c!=='#'&&c!=='.') items.push([y,()=>drawObj(c,x,y)]);}
  const fx=p.x+(p.tx-p.x)*p.t, fy=p.y+(p.ty-p.y)*p.t;
  const row=p.moving?(1+Math.floor(p.anim*2))%4:0;   // 한 타일에 2프레임: 0 → 1 → 2 → 3
  items.push([fy,()=>{ if(img.complete) ctx.drawImage(img,COL[p.dir]*CW,row*CH,CW,CH,Math.round(fx*T),Math.round(fy*T)+T-26,CW,CH); }]);
  items.sort((a,b)=>a[0]-b[0]).forEach(i=>i[1]());

  /* 가로등 불빛 */
  for(let y=0;y<H;y++)for(let x=0;x<W;x++) if(MAP[y][x]==='L'){
    const g=ctx.createRadialGradient(x*T+10,y*T-14,2,x*T+10,y*T-14,46);
    g.addColorStop(0,'rgba(255,255,230,.28)'); g.addColorStop(1,'rgba(255,255,230,0)');
    ctx.fillStyle=g; ctx.fillRect(x*T-40,y*T-60,100,110);
  }
}

/* 화면 크기에 맞춰 정수 배율로 확대 */
const sc=$('#scene');
function fit(){
  let s=Math.min(sc.clientWidth/(W*T),sc.clientHeight/(H*T)); if(s>=1) s=Math.floor(s);
  cv.style.width=W*T*s+'px'; cv.style.height=H*T*s+'px';
}
new ResizeObserver(fit).observe(sc); fit();

let last=performance.now();
(function loop(now){ const dt=Math.min((now-last)/1000,.05); last=now; update(dt); draw(); requestAnimationFrame(loop); })(last);
})();
