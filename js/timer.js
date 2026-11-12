(()=>{
const $=s=>document.querySelector(s), pad=n=>String(n).padStart(2,'0');

let sec=10*3600+32*60+48, run=true;
const show=()=>$('#time').textContent=`${pad(sec/3600|0)}:${pad(sec%3600/60|0)}:${pad(sec%60)}`;
setInterval(()=>{if(run){sec++;show()}},1000);
$('#pause').onclick=()=>{run=!run;$('#pause').textContent=run?'⏸ PAUSE':'▶ RESUME'};
$('#stop').onclick=()=>{run=false;sec=0;show();$('#pause').textContent='▶ START'};
})();
