(()=>{
const $=s=>document.querySelector(s), Q=window.QuietWorld, date=Q.today();
const defaultTodos=[
  {id:'vitality',tag:'VITALITY',label:'생기 / 몸',text:'물 두 컵 마시기',done:false,rewarded:false},
  {id:'focus',tag:'FOCUS',label:'집중 / 시작',text:'과제 20분만 해 보기',done:false,rewarded:false},
  {id:'echo',tag:'ECHO',label:'메아리 / 마음',text:'오늘 기분 한 줄 적기',done:false,rewarded:false},
  {id:'flow',tag:'FLOW',label:'흐름 / 루틴',text:'오늘 루틴 다 하기',done:false,rewarded:false},
  {id:'spark',tag:'SPARK',label:'반짝임 / 만들기',text:'뭐든 하나 만들어 보기',done:false,rewarded:false},
  {id:'bond',tag:'BOND',label:'연결 / 사람',text:'누구한테든 말 한마디 하기',done:false,rewarded:false}
];
const rewardIndex={vitality:0,focus:1,echo:2,flow:3,spark:4,bond:5};
const key=`todos:${date}`;
let todos=Q.read(key,defaultTodos.map(todo=>({...todo})));
let editingId=null;
if(!Array.isArray(todos)) throw new TypeError('Saved todo list must be an array.');

function draw(){
  const list=$('#todos');
  list.replaceChildren(...todos.map((todo,index)=>{
    if(editingId===todo.id){
      const form=document.createElement('form'), input=document.createElement('input');
      const save=document.createElement('button'), cancel=document.createElement('button');
      form.className='todo-edit-form'; form.dataset.index=index;
      input.value=todo.text; input.maxLength=80; input.required=true;
      input.setAttribute('aria-label','할 일 내용 수정');
      save.className='btn'; save.type='submit'; save.textContent='저장';
      cancel.className='btn'; cancel.type='button'; cancel.dataset.action='cancel-edit'; cancel.textContent='취소';
      form.append(input,save,cancel);
      return form;
    }
    const row=document.createElement('div'), toggle=document.createElement('button');
    const check=document.createElement('span'), text=document.createElement('span');
    const tag=document.createElement('span'), label=document.createElement('em');
    const detail=document.createElement('span'), actions=document.createElement('span');
    const edit=document.createElement('button'), remove=document.createElement('button');
    row.className=`todo${todo.done?' done':''}`;
    row.dataset.index=index;
    toggle.className='todo-toggle'; toggle.type='button';
    toggle.setAttribute('aria-pressed',String(todo.done));
    toggle.setAttribute('aria-label',`${todo.done?'완료 취소':'완료'}: ${todo.text}`);
    check.className='cb'; check.textContent=todo.done?'✓':'';
    toggle.append(check);
    text.className='tx';
    tag.className='tag'; tag.textContent=todo.tag;
    label.textContent=todo.label;
    tag.append(label);
    detail.className='d'; detail.textContent=todo.text;
    text.append(tag,detail);
    actions.className='todo-actions';
    edit.className='todo-edit'; edit.type='button'; edit.dataset.action='edit';
    edit.setAttribute('aria-label',`할 일 수정: ${todo.text}`); edit.textContent='✎';
    remove.className='todo-remove'; remove.type='button'; remove.dataset.action='remove';
    remove.setAttribute('aria-label',`할 일 삭제: ${todo.text}`); remove.textContent='×';
    actions.append(edit,remove);
    row.append(toggle,text,actions);
    return row;
  }));
  const completed=todos.filter(todo=>todo.done).length;
  const percent=todos.length?Math.round(completed/todos.length*100):0;
  $('#barfill').style.width=`${percent}%`;
  $('#pcount').textContent=`${completed} / ${todos.length}`;
  $('#ppct').textContent=`${percent}%`;
}

$('#todos').onclick=event=>{
  const actionButton=event.target.closest('[data-action]');
  const action=actionButton?actionButton.dataset.action:null;
  if(action==='cancel-edit'){
    editingId=null;
    draw();
    return;
  }
  const row=event.target.closest('.todo');
  if(!row) return;
  const index=Number(row.dataset.index), todo=todos[index];
  if(action==='remove'){
    todos.splice(index,1);
    Q.write(key,todos);
    window.addDayLog(`할 일을 삭제했어요: ${todo.text}`);
  }else if(action==='edit'){
    editingId=todo.id;
    draw();
    const input=$('#todos .todo-edit-form input');
    input.focus();
    input.select();
    return;
  }else if(event.target.closest('.todo-toggle')){
    todo.done=!todo.done;
    Q.write(key,todos);
    if(todo.done&&!todo.rewarded&&Object.prototype.hasOwnProperty.call(rewardIndex,todo.id)){
      todo.rewarded=true;
      Q.write(key,todos);
      window.addFragment(rewardIndex[todo.id]);
    }
    window.addDayLog(`${todo.done?'할 일을 완료했어요':'완료를 취소했어요'}: ${todo.text}`);
  }else{
    return;
  }
  draw();
  Q.changed();
};

$('#todos').onsubmit=event=>{
  const form=event.target.closest('.todo-edit-form');
  if(!form) return;
  event.preventDefault();
  const todo=todos[Number(form.dataset.index)];
  const input=form.querySelector('input'), text=input.value.trim();
  if(!text) return;
  if(text!==todo.text){
    todo.text=text;
    Q.write(key,todos);
    window.addDayLog(`할 일을 수정했어요: ${todo.text}`);
    Q.changed();
  }
  editingId=null;
  draw();
};

$('#todo-form').onsubmit=event=>{
  event.preventDefault();
  const input=$('#todo-input'), text=input.value.trim();
  if(!text) return;
  todos.push({id:`custom-${Date.now()}`,tag:'CUSTOM',label:'내 할 일',text,done:false,rewarded:false});
  Q.write(key,todos);
  input.value='';
  draw();
  window.addDayLog(`새 할 일을 추가했어요: ${text}`);
  Q.changed();
};

draw();
})();
