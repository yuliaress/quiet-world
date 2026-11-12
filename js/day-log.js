(()=>{
const $=s=>document.querySelector(s), Q=window.QuietWorld, key=`logs:${Q.today()}`;
let logs=Q.read(key,[]);
if(!Array.isArray(logs)) throw new TypeError('Saved day log must be an array.');

function draw(){
  const list=$('#logs');
  list.replaceChildren();
  if(!logs.length){
    const empty=document.createElement('li');
    empty.className='empty';
    empty.textContent='아직 오늘 기록이 없어요.';
    list.append(empty);
    return;
  }
  logs.forEach(entry=>{
    const item=document.createElement('li');
    item.textContent=`${entry.time} ${entry.text}`;
    list.append(item);
  });
}

window.addDayLog=text=>{
  const now=new Date();
  logs.unshift({
    time:`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`,
    text
  });
  logs=logs.slice(0,100);
  Q.write(key,logs);
  draw();
  Q.changed();
};

$('#more').onclick=()=>{
  const open=$('#logs').classList.toggle('open');
  $('#more').textContent=open?'접기 ▴':'더 보기 ▾';
};
draw();
})();
