(()=>{
const $=s=>document.querySelector(s), Q=window.QuietWorld, date=Q.today();
const key=`timer:${date}`, totalKey=`focus-total:${date}`;
const empty=()=>({seconds:0,startedAt:null,sessionStartedAt:null});
let timer=Q.read(key,empty());
if(!Number.isFinite(timer.seconds)||timer.seconds<0) throw new TypeError('Saved timer duration is invalid.');

const elapsed=()=>timer.seconds+(timer.startedAt===null?0:Math.floor((Date.now()-timer.startedAt)/1000));
const clock=seconds=>{
  const value=Math.max(0,Math.floor(seconds));
  return `${String(Math.floor(value/3600)).padStart(2,'0')}:${String(Math.floor(value%3600/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`;
};
const save=()=>Q.write(key,timer);
function render(){
  const running=timer.startedAt!==null, seconds=elapsed();
  $('#time').textContent=clock(seconds);
  $('#start-time').textContent=timer.sessionStartedAt===null
    ?'시작하지 않음'
    :`시작 ${new Date(timer.sessionStartedAt).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false})}`;
  $('#pause').textContent=running?'⏸ PAUSE':seconds?'▶ RESUME':'▶ START';
  $('#stop').disabled=seconds===0;
  window.focusSecondsToday=seconds;
}

$('#pause').onclick=()=>{
  if(timer.startedAt!==null){
    timer.seconds=elapsed();
    timer.startedAt=null;
    save();
    window.addDayLog(`집중 타이머 일시정지 · ${clock(timer.seconds)}`);
  }else{
    const firstStart=timer.sessionStartedAt===null;
    timer.startedAt=Date.now();
    if(firstStart) timer.sessionStartedAt=timer.startedAt;
    save();
    if(firstStart) window.addDayLog('집중 타이머를 시작했어요.');
  }
  render();
  Q.changed();
};

$('#stop').onclick=()=>{
  const seconds=elapsed();
  if(seconds>0){
    const total=Q.read(totalKey,0)+seconds;
    Q.write(totalKey,total);
    window.addDayLog(`집중 타이머 종료 · ${clock(seconds)}`);
  }
  timer=empty();
  save();
  render();
  Q.changed();
};

render();
setInterval(()=>{
  render();
  if(timer.startedAt!==null) Q.changed();
},1000);
})();
