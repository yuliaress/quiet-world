(()=>{
const $=s=>document.querySelector(s), Q=window.QuietWorld;
const key='fragments';
const names=[['생기','🧪'],['집중','📕'],['메아리','🖼'],['흐름','⏱'],['반짝임','✏️'],['연결','🗝']];
const indexById={vitality:0,focus:1,echo:2,flow:3,spark:4,bond:5};
let state=Q.read(key,{counts:[0,0,0,0,0,0],bookHandled:false,bookPicked:false});
if(!Array.isArray(state.counts)||state.counts.length!==names.length||state.counts.some(count=>!Number.isInteger(count)||count<0)) throw new TypeError('Saved fragment data is invalid.');

function draw(){
  $('#frag').replaceChildren(...names.map(([name,icon],index)=>{
    const item=document.createElement('div'), label=document.createElement('div');
    const symbol=document.createElement('span'), count=document.createElement('div');
    label.className='n'; label.textContent=name;
    symbol.className='ic ico'; symbol.textContent=icon;
    count.className='c'; count.textContent=state.counts[index];
    item.append(label,symbol,count);
    return item;
  }));
}

window.addFragment=index=>{
  if(!Number.isInteger(index)||index<0||index>=names.length) throw new RangeError('Unknown fragment index.');
  state.counts[index]++;
  Q.write(key,state);
  draw();
  Q.changed();
};

function getCostEntries(costs){
  if(!costs||typeof costs!=='object'||Array.isArray(costs)) throw new TypeError('Fragment recipe is invalid.');
  const entries=Object.entries(costs);
  if(entries.some(([id,count])=>!Number.isInteger(indexById[id])||!Number.isInteger(count)||count<1)) throw new TypeError('Fragment recipe is invalid.');
  return entries;
}

window.canSpendFragments=costs=>getCostEntries(costs).every(([id,count])=>state.counts[indexById[id]]>=count);

window.spendFragments=costs=>{
  const entries=getCostEntries(costs);
  if(!entries.every(([id,count])=>state.counts[indexById[id]]>=count)) return false;
  entries.forEach(([id,count])=>{state.counts[indexById[id]]-=count});
  Q.write(key,state);
  draw();
  Q.changed();
  return true;
};

function handleBook(picked){
  if(state.bookHandled) return;
  state.bookHandled=true;
  state.bookPicked=picked;
  if(picked) state.counts[2]++;
  Q.write(key,state);
  $('#disc').classList.add('hide');
  window.addDayLog(picked?'낡은 노트를 주웠어요. [ECHO +1]':'책을 두고 지나갔어요.');
  draw();
  Q.changed();
}

$('#take').onclick=()=>handleBook(true);
$('#leave').onclick=()=>handleBook(false);
if(state.bookHandled) $('#disc').classList.add('hide');
draw();
})();
