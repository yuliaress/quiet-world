(()=>{
const Q=window.QuietWorld, date=Q.today();
const key=`badges:${date}`;
const badges=[
  {id:'first-step',name:'FIRST STEP',description:'오늘 할 일 하나 완료',icon:'🛡',earned:()=>Q.read(`todos:${date}`,[]).some(todo=>todo.done)},
  {id:'deep-focus',name:'DEEP FOCUS',description:'오늘 집중 25분 달성',icon:'📖',earned:()=>Q.read(`focus-total:${date}`,0)+(window.focusSecondsToday||0)>=25*60},
  {id:'daily-ritual',name:'DAILY RITUAL',description:'오늘 루틴 하나 완료',icon:'🌱',earned:()=>Object.values(Q.read(`routine-checks:${date}`,{done:{}}).done).some(Boolean)},
  {id:'echo',name:'ECHO',description:'오늘 낡은 노트 수집',icon:'🗝',earned:()=>Q.read('fragments',{counts:[],bookPicked:false}).bookPicked}
];
let unlocked=Q.read(key,{});

function draw(){
  let earned=0;
  let updated=false;
  const items=badges.map(badge=>{
    if(badge.earned()&&!unlocked[badge.id]){
      unlocked[badge.id]=true;
      updated=true;
    }
    const isUnlocked=Boolean(unlocked[badge.id]);
    if(isUnlocked) earned++;
    const item=document.createElement('div'), icon=document.createElement('div');
    const label=document.createElement('small');
    item.title=badge.description;
    icon.className=`b badge ico${isUnlocked?' unlocked':' lock'}`;
    icon.textContent=isUnlocked?badge.icon:'🔒';
    label.textContent=badge.name;
    item.append(icon,label);
    return item;
  });
  if(updated) Q.write(key,unlocked);
  document.querySelector('#badges').replaceChildren(...items);
  document.querySelector('#badge-count').textContent=`${earned} / ${badges.length}`;
}

window.addEventListener('quiet-world:change',draw);
draw();
})();
