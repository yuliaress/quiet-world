(()=>{
const $=s=>document.querySelector(s), Q=window.QuietWorld, date=Q.today();
const routinesKey='routines';
const defaults=[
  {id:'morning',name:'☀ MORNING',description:'물 마시기 / 스트레칭 / 창문 열기'},
  {id:'night',name:'☾ NIGHT',description:'정리 / 기록 / 내일 준비'}
];
let routines=Q.read(routinesKey,defaults);
let checks=Q.read(`routine-checks:${date}`,{done:{},rewarded:{}});
let editingId=null;
if(!Array.isArray(routines)||!checks.done||!checks.rewarded) throw new TypeError('Saved routine data is invalid.');

function draw(){
  $('#routines').replaceChildren(...routines.map(routine=>{
    if(editingId===routine.id){
      const row=document.createElement('div'), form=document.createElement('form');
      const name=document.createElement('input'), description=document.createElement('input');
      const save=document.createElement('button'), cancel=document.createElement('button');
      row.className='rt routine-editing';
      row.dataset.id=routine.id;
      form.className='routine-edit-form'; form.dataset.id=routine.id;
      name.value=routine.name; name.maxLength=32; name.required=true;
      name.setAttribute('aria-label','루틴 이름 수정');
      description.value=routine.description; description.maxLength=80;
      description.setAttribute('aria-label','루틴 설명 수정');
      save.className='btn'; save.type='submit'; save.textContent='저장';
      cancel.className='btn'; cancel.type='button'; cancel.dataset.action='cancel-edit'; cancel.textContent='취소';
      form.append(name,description,save,cancel);
      row.append(form);
      return row;
    }
    const row=document.createElement('div'), toggle=document.createElement('button');
    const text=document.createElement('span'), name=document.createElement('b');
    const description=document.createElement('small'), check=document.createElement('span');
    const actions=document.createElement('span'), edit=document.createElement('button');
    const remove=document.createElement('button'), done=Boolean(checks.done[routine.id]);
    row.className=`rt${done?' done':''}`;
    row.dataset.id=routine.id;
    toggle.className='routine-toggle'; toggle.type='button'; toggle.dataset.action='toggle';
    toggle.setAttribute('aria-pressed',String(done));
    toggle.setAttribute('aria-label',`${done?'완료 취소':'완료'}: ${routine.name}`);
    text.className='routine-text';
    name.textContent=routine.name; description.textContent=routine.description;
    check.className='routine-check'; check.textContent=done?'✓':'○';
    text.append(name,description); toggle.append(text,check);
    actions.className='routine-actions';
    edit.className='routine-action'; edit.type='button'; edit.dataset.action='edit';
    edit.setAttribute('aria-label',`루틴 수정: ${routine.name}`); edit.textContent='✎';
    remove.className='routine-action'; remove.type='button'; remove.dataset.action='remove';
    remove.setAttribute('aria-label',`루틴 삭제: ${routine.name}`); remove.textContent='×';
    actions.append(edit,remove); row.append(toggle,actions);
    return row;
  }));
}

$('#routines').onclick=event=>{
  const row=event.target.closest('.rt');
  if(!row) return;
  const actionButton=event.target.closest('[data-action]');
  if(!actionButton) return;
  const action=actionButton.dataset.action;
  const selected=routines.find(item=>item.id===row.dataset.id);
  if(!selected) return;
  if(action==='toggle'){
    checks.done[selected.id]=!checks.done[selected.id];
    if(checks.done[selected.id]&&!checks.rewarded[selected.id]){
      checks.rewarded[selected.id]=true;
      Q.write(`routine-checks:${date}`,checks);
      window.addFragment(3);
    }
    Q.write(`routine-checks:${date}`,checks);
    window.addDayLog(`${checks.done[selected.id]?'루틴을 완료했어요':'루틴 완료를 취소했어요'}: ${selected.name}`);
  }else if(action==='remove'){
    routines=routines.filter(item=>item.id!==selected.id);
    Q.write(routinesKey,routines);
    window.addDayLog(`루틴을 삭제했어요: ${selected.name}`);
  }else if(action==='edit'){
    editingId=selected.id;
    draw();
    const input=$('#routines .routine-edit-form input');
    input.focus();
    input.select();
    return;
  }else if(action==='cancel-edit'){
    editingId=null;
    draw();
    return;
  }else{
    return;
  }
  draw();
  Q.changed();
};

$('#routines').onsubmit=event=>{
  const form=event.target.closest('.routine-edit-form');
  if(!form) return;
  event.preventDefault();
  const routine=routines.find(item=>item.id===form.dataset.id);
  const inputs=form.querySelectorAll('input');
  const name=inputs[0].value.trim(), description=inputs[1].value.trim();
  if(!name) return;
  if(name!==routine.name||description!==routine.description){
    routine.name=name;
    routine.description=description;
    Q.write(routinesKey,routines);
    window.addDayLog(`루틴을 수정했어요: ${routine.name}`);
    Q.changed();
  }
  editingId=null;
  draw();
};

$('#routine-form').onsubmit=event=>{
  event.preventDefault();
  const nameInput=$('#routine-name'), descriptionInput=$('#routine-description');
  const name=nameInput.value.trim();
  if(!name) return;
  const routine={id:`routine-${Date.now()}`,name,description:descriptionInput.value.trim()};
  routines.push(routine);
  Q.write(routinesKey,routines);
  nameInput.value='';
  descriptionInput.value='';
  draw();
  window.addDayLog(`새 루틴을 추가했어요: ${routine.name}`);
  Q.changed();
};

draw();
})();
