(()=>{
const $=selector=>document.querySelector(selector);
const Q=window.QuietWorld, capacity=32, key='room';
const materials={vitality:'생기',focus:'집중',echo:'메아리',flow:'흐름',spark:'반짝임',bond:'연결'};
const items=[
  {id:'plant',name:'작은 화분',icon:'🪴',cost:{vitality:1,flow:1}},
  {id:'rug',name:'포근한 러그',icon:'🧶',cost:{spark:1,bond:1}},
  {id:'lamp',name:'탁상 조명',icon:'🪔',cost:{focus:1,spark:1}},
  {id:'bookshelf',name:'책장',icon:'📚',cost:{focus:2,echo:1}}
];
const itemById=Object.fromEntries(items.map(item=>[item.id,item]));
const hasItem=id=>Object.prototype.hasOwnProperty.call(itemById,id);
let state=Q.read(key,{inventory:{},placed:[]}), selected=null;

if(!state||typeof state!=='object'||Array.isArray(state)||!state.inventory||typeof state.inventory!=='object'||Array.isArray(state.inventory)||!Array.isArray(state.placed)) throw new TypeError('Saved room data is invalid.');
if(Object.keys(state.inventory).some(id=>!hasItem(id)||!Number.isInteger(state.inventory[id])||state.inventory[id]<0)) throw new TypeError('Saved room inventory is invalid.');
const occupiedSlots=new Set();
state.placed.forEach(entry=>{
  if(!entry||!Number.isInteger(entry.slot)||entry.slot<0||entry.slot>=capacity||!hasItem(entry.itemId)||occupiedSlots.has(entry.slot)) throw new TypeError('Saved room layout is invalid.');
  occupiedSlots.add(entry.slot);
});
items.forEach(item=>{if(state.inventory[item.id]===undefined) state.inventory[item.id]=0});

function setStatus(message){$('#room-status').textContent=message}
function save(){
  Q.write(key,state);
  Q.changed();
}
function costLabel(cost){
  return Object.entries(cost).map(([id,count])=>`${materials[id]} ${count}`).join(' · ');
}
function drawGrid(){
  const grid=$('#room-grid');
  grid.replaceChildren(...Array.from({length:capacity},(_,slot)=>{
    const placed=state.placed.find(entry=>entry.slot===slot);
    const tile=document.createElement('button');
    tile.type='button';
    tile.className=`room-tile${placed?' occupied':''}${!placed&&selected?' can-place':''}`;
    tile.setAttribute('role','gridcell');
    if(placed){
      const item=itemById[placed.itemId], icon=document.createElement('span');
      icon.className='ico furniture-icon';
      icon.textContent=item.icon;
      icon.setAttribute('aria-hidden','true');
      tile.setAttribute('aria-label',`${item.name}, 누르면 보관함으로 옮기기`);
      tile.append(icon);
    }else{
      tile.setAttribute('aria-label',`빈 타일 ${slot+1}${selected?'에 소품 배치':''}`);
      if(selected) tile.textContent='+';
    }
    tile.onclick=()=>{
      const current=state.placed.find(entry=>entry.slot===slot);
      if(current){
        const item=itemById[current.itemId];
        state.placed=state.placed.filter(entry=>entry.slot!==slot);
        state.inventory[current.itemId]++;
        save();
        setStatus(`${item.name}을 보관함으로 옮겼어요.`);
      }else if(selected){
        if(state.inventory[selected]<1) throw new Error('Selected room item is not available.');
        state.inventory[selected]--;
        state.placed.push({slot,itemId:selected});
        const item=itemById[selected];
        selected=null;
        save();
        setStatus(`${item.name}을 방에 배치했어요.`);
      }else{
        setStatus('보관함에서 배치할 소품을 먼저 골라 주세요.');
        return;
      }
      render();
    };
    return tile;
  }));
}
function drawInventory(){
  const container=$('#room-inventory');
  const owned=items.filter(item=>state.inventory[item.id]>0);
  if(!owned.length){
    const empty=document.createElement('p');
    empty.className='room-empty';
    empty.textContent='아직 소품이 없어요. 작업대에서 만들어 보세요.';
    container.replaceChildren(empty);
    return;
  }
  container.replaceChildren(...owned.map(item=>{
    const button=document.createElement('button'), icon=document.createElement('span'), name=document.createElement('span');
    button.type='button';
    button.className=`inventory-item${selected===item.id?' selected':''}`;
    button.setAttribute('aria-pressed',String(selected===item.id));
    icon.className='ico';
    icon.textContent=item.icon;
    icon.setAttribute('aria-hidden','true');
    name.textContent=`${item.name} × ${state.inventory[item.id]}`;
    button.append(icon,name);
    button.onclick=()=>{
      selected=selected===item.id?null:item.id;
      setStatus(selected?`${item.name}을 골랐어요. 방의 빈 타일을 눌러 배치하세요.`:'소품 선택을 취소했어요.');
      render();
    };
    return button;
  }));
}
function drawRecipes(){
  const container=$('#room-crafting');
  container.replaceChildren(...items.map(item=>{
    const card=document.createElement('div'), title=document.createElement('strong'), icon=document.createElement('span'), name=document.createElement('span');
    const cost=document.createElement('span'), button=document.createElement('button');
    card.className='craft-card';
    icon.className='ico';
    icon.textContent=item.icon;
    icon.setAttribute('aria-hidden','true');
    name.className='craft-name';
    name.textContent=item.name;
    title.append(icon,name);
    cost.className='craft-cost';
    cost.textContent=costLabel(item.cost);
    button.type='button';
    button.className='btn craft-button';
    button.textContent='만들기';
    button.disabled=!window.canSpendFragments(item.cost);
    button.onclick=()=>{
      if(!window.spendFragments(item.cost)){
        setStatus('재료가 부족해요. 할 일이나 루틴을 완료해 재료를 모아 주세요.');
        render();
        return;
      }
      state.inventory[item.id]++;
      save();
      setStatus(`${item.name}을 만들었어요. 보관함에서 골라 배치해 보세요.`);
      render();
    };
    card.append(title,cost,button);
    return card;
  }));
}
function render(){
  const count=state.placed.length;
  $('#room-count').textContent=`${count} / ${capacity}`;
  drawGrid();
  drawInventory();
  drawRecipes();
}

window.addEventListener('quiet-world:change',render);
render();
})();
