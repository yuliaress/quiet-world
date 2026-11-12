(()=>{
const $=s=>document.querySelector(s);

const todos=[['VITALITY','생기 / 몸','물 두 컵 마시기',1],['FOCUS','집중 / 시작','과제 20분만 해 보기',1],
 ['ECHO','메아리 / 마음','오늘 기분 한 줄 적기',0],['FLOW','흐름 / 루틴','오늘 루틴 다 하기',1],
 ['SPARK','반짝임 / 만들기','뭐든 하나 만들어 보기',0],['BOND','연결 / 사람','누구한테든 말 한마디 하기',0]];
function drawTodos(){
  $('#todos').innerHTML=todos.map((t,i)=>`<div class="todo ${t[3]?'done':''}" data-i="${i}">
    <span class="cb">${t[3]?'✓':''}</span>
    <span class="tx"><span class="tag">${t[0]}<em>${t[1]}</em></span><span class="d">${t[2]}</span></span><span class="st">✧</span></div>`).join('');
  const n=todos.filter(t=>t[3]).length,p=Math.round(n/todos.length*100);
  $('#barfill').style.width=p+'%';$('#pcount').textContent=`${n} / ${todos.length}`;$('#ppct').textContent=p+'%';
}
$('#todos').onclick=e=>{const el=e.target.closest('.todo');if(!el)return;
  const t=todos[+el.dataset.i];t[3]=t[3]?0:1;drawTodos()};
drawTodos();
})();
