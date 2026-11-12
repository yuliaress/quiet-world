(()=>{
const $=s=>document.querySelector(s), pad=n=>String(n).padStart(2,'0');

window.addDayLog=t=>{const d=new Date(),li=document.createElement('li');
  li.textContent=`${pad(d.getHours())}:${pad(d.getMinutes())} ${t}`;$('#logs').prepend(li)};
$('#more').onclick=()=>{const o=$('#logs').classList.toggle('open');$('#more').textContent=o?'접기 ▴':'더 보기 ▾'};
})();
