import {MATERIALS,ITEMS,MOODS,itemById,materialIndex,dayKey,clock,formatDate,validDate,ORES,oreIndex,oreAt,CYCLE_MS} from './game-data.js';
import {createOreViews} from './ore-ui.js';
import * as Store from './game-store.js';

const paths={
  home:'M3 10 12 3l9 7M5 9v11h14V9M9 20v-7h6v7',
  sun:'M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  moon:'M20.5 13.2A8.5 8.5 0 0 1 10.8 3.5a8.5 8.5 0 1 0 9.7 9.7Z',
  cloud:'M6 18a4 4 0 0 1-1-7.9A6 6 0 0 1 16.6 9 4.5 4.5 0 1 1 1 9H6Z',
  rain:'M6 15a4 4 0 0 1-1-7.9A6 6 0 0 1 16.6 6 4.5 4.5 0 1 1 1 9H6ZM7 18l-1 3m6-3-1 3m6-3-1 3',
  book:'M4 4h7a4 4 0 0 1 1 1 4 4 0 0 1 1-1h7v15h-7a3 3 0 0 0-1 1 3 3 0 0 0-1-1H4ZM12 5v15',
  grid:'M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z',
  clock:'M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  calendar:'M7 3v4m10-4v4M4 10h16M4 5h16v16H4Z',
  check:'m5 12 4 4L19 6',plus:'M12 5v14M5 12h14',close:'m6 6 12 12M18 6 6 18',
  edit:'m15 4 5 5M4 20l5-1L20 8a2 2 0 0 0-5-5L4 15Z',
  trash:'M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7',
  arrow:'M5 12h14m-5-5 5 5-5 5',play:'m9 5 11 7-11 7Z',pause:'M8 5v14M16 5v14',stop:'M6 6h12v12H6Z',
  leaf:'M20 3C8 2 2 8 5 16c8 5 16-2 15-13ZM5 21 16 9',
  shield:'M12 3 3 6v6c0 5 9 9 9 9s9-4 9-9V6ZM8 12l3 3 5-6',
  download:'M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4',upload:'M12 16V4m-4 4 4-4 4 4M4 17v4h16v-4',
  info:'M12 11v6m0-10v1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
};
let lastOre=oreAt();
const icon=(name)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.grid}"/></svg>`;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=selector=>document.querySelector(selector);
const routes=[['today','오늘','sun'],['room','내 방','home'],['records','기록','book'],['collection','수집과 설정','grid']];
const getRoute=()=>routes.some(([r])=>r===location.hash.slice(1))?location.hash.slice(1):'today';
const requestedDate=new URL(location.href).searchParams.get('date');
const ui={route:getRoute(),recordDate:validDate(requestedDate)&&requestedDate<=dayKey()?requestedDate:dayKey(),todoText:'',todoCategory:'vitality',journalDrafts:{},journalBases:{},editing:false,roomDraft:null,roomBase:null,selectedItem:null,selectedSlot:null,roomStatus:'',busy:false,pendingImport:null,pendingRaw:null,legacyBacked:false,dialogBase:null,dialogDate:null,exchangeOre:oreAt(),exchangeAmount:'',pendingExchange:null,receiptPage:0};
let boot=Store.load(), toastTimeout, installPrompt=null,installStatus='처음 연결한 뒤에는 오프라인에서도 이용할 수 있어요.',busyTick=false,lastDate=dayKey(),lastRev=null;

function toast(message,error=false){const el=$('#toast');el.textContent=message;el.classList.add('visible');el.style.background=error?'#845249':'';clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.classList.remove('visible'),5000);}
function fieldError(form,message){if(!form)return;let error=form.querySelector('[data-form-error]');if(!error){error=document.createElement('p');error.dataset.formError='';error.className='notice error section-gap';error.setAttribute('role','alert');error.tabIndex=-1;form.append(error);}error.textContent=message;error.focus({preventScroll:true});}
async function perform(fn,message){if(ui.busy)return;ui.busy=true;const formId=document.activeElement?.closest('form')?.id;$('#app').setAttribute('aria-busy','true');$('#modal').setAttribute('aria-busy','true');try{await fn();if(message)toast(message);return true;}catch(e){const text=e.message||'저장하지 못했어요. 다시 시도해 주세요.';toast(text,true);if(formId)fieldError(document.getElementById(formId),text);return false;}finally{ui.busy=false;$('#app').removeAttribute('aria-busy');$('#modal').removeAttribute('aria-busy');}}
const btn=(label,action,options='')=>`<button type="button" class="btn" data-action="${action}" ${options}>${label}</button>`;
const iconButton=(name,action,label,attrs='')=>`<button type="button" class="icon-btn" data-action="${action}" aria-label="${esc(label)}" ${attrs}>${icon(name)}</button>`;
function maiSays(s,d){if(s.timer.running)return '나도 옆에서 조용히 기다릴게. 우리 조금만 집중해 볼까?';if(d.todos.some(t=>t.done))return '오늘의 작은 일이 이 방의 한 조각이 되었네.';if(s.room.placed.length)return '네가 놓아 준 것들 덕분에 이곳이 더 좋아졌어.';if(d.mood===0)return '비 오는 마음에도, 네 자리는 여기 있어.';return '아무것도 서두르지 않아도 돼. 오늘도 여기 있을게.';}
function nav(className){return `<nav class="${className}" aria-label="주 메뉴">${routes.map(([id,name,ico])=>`<a href="#${id}" class="${ui.route===id?'active':''}" ${ui.route===id?'aria-current="page"':''}>${icon(ico)}<span>${name}</span></a>`).join('')}</nav>`;}
function layout(content,s){return `<header class="topbar"><a href="#today" class="brand" aria-label="QUIET WORLD 오늘"><span class="brand-mark" aria-hidden="true"></span><div><div class="brand-title">QUIET WORLD</div><div class="brand-sub">나의 속도로 가꾸는 작은 세계</div></div></a>${nav('navigation')}<span class="local-status"><span class="status-dot"></span>이 기기에 보관 중</span></header><main class="shell" id="main" tabindex="-1">${content}<footer class="app-footer"><span>작은 하루가 모여, 나만의 세계가 돼요.</span><span>기록은 이 브라우저에만 남아요. 수집과 설정에서 백업해 주세요.</span></footer></main>${nav('bottom-nav')}`;}
function heading(title,sub,right=''){return `<div class="page-heading"><div><h1>${title}</h1><p>${sub}</p></div>${right}</div>`;}
function roomScene(s,editable=false){
  const room=editable&&ui.editing?ui.roomDraft:s.room;
  return `<div class="room-scene ${editable&&ui.editing?'editing':''}" aria-label="색상 블록으로 표현한 나의 방"><span class="wall-label">오늘도, 나의 작은 방</span><div class="room-window" aria-hidden="true"></div><div class="wall-note" aria-hidden="true"></div><div class="mai-character" aria-hidden="true"><span class="mai-name">마이</span><div class="mai-body"></div><div class="mai-shadow"></div></div>${!room.placed.length?'<p class="room-blank-hint">광석을 모아<br>내 취향을 하나씩 놓아 보아요.</p>':''}<div class="room-floor" role="group" aria-label="가구 배치 공간, 8열 4행">${Array.from({length:32},(_,slot)=>{
    const p=room.placed.find(p=>p.slot===slot),item=p?itemById[p.itemId]:null;
    const label=`${Math.floor(slot/8)+1}행 ${slot%8+1}열, ${item?item.name:'빈칸'}`;
    const contents=item?`<span class="room-object ${item.id}" style="--item-color:${item.color}"><span>${item.name}</span></span>`:ui.editing&&editable?'<span aria-hidden="true">+</span>':'';
    return editable&&ui.editing?`<button type="button" class="room-tile ${ui.selectedSlot===slot?'selected':''}" data-action="tile" data-slot="${slot}" aria-label="${label}${item?', 선택하여 이동 또는 회수':', 선택한 가구 배치'}" aria-pressed="${ui.selectedSlot===slot}">${contents}</button>`:`<span class="room-tile" ${item?`role="img" aria-label="${label}"`:'aria-hidden="true"'}>${contents}</span>`;
  }).join('')}</div><span class="scene-caption">이미지 대신 색상으로 표현한 방이에요.</span></div>`;
}
function roomPanel(s,d,editable=false){return `<section class="panel room-panel" aria-labelledby="room-title"><div class="panel-head"><h2 id="room-title">${icon('home')} 나의 작은 방</h2><div class="row"><span class="pill">${(ui.editing&&editable?ui.roomDraft:s.room).placed.length} / 32칸</span>${!editable?'<a class="text-link" href="#room">방 꾸미기 '+icon('arrow')+'</a>':''}</div></div>${roomScene(s,editable)}${editable?`<div class="edit-toolbar">${ui.editing?`<p>${ui.selectedItem?`${itemById[ui.selectedItem].name}을 놓을 빈칸을 골라 주세요.`:ui.selectedSlot!==null?'빈칸을 누르면 이동해요. 회수할 수도 있어요.':'보관함의 가구나 방 안의 가구를 골라 주세요.'}</p><div class="row">${ui.selectedSlot!==null?btn('회수','recall'):''}${btn('취소','cancel-room')}<button type="button" class="btn primary" data-action="save-room">배치 저장</button></div>`:`<p>편집 모드에서 가구를 놓거나 옮길 수 있어요.</p><button type="button" class="btn primary" data-action="edit-room">${icon('edit')} 방 편집</button>`}</div>${ui.roomStatus?`<div class="room-status" role="status">${esc(ui.roomStatus)}</div>`:''}`:''}<div class="room-footer"><span class="mai-avatar" aria-hidden="true"></span><div class="mai-says"><b>마이</b>${maiSays(s,d)}</div></div>${resources(s)}</section>`;}
function todoPanel(d){
  const complete=d.todos.filter(t=>t.done).length,percentage=d.todos.length?Math.round(complete/d.todos.length*100):0;
  return `<section class="panel todo-panel" aria-labelledby="todo-title"><div class="panel-head"><h2 id="todo-title">오늘의 작은 일</h2><span class="pill">${complete} / ${d.todos.length}</span></div><div class="progress-numbers"><span>내 속도로, 하나씩</span><b>${percentage}%</b></div><div class="progress-track" role="progressbar" aria-label="오늘 할 일 완료율" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percentage}"><div class="progress-fill" style="width:${percentage}%"></div></div><div class="todo-list">${d.todos.length?d.todos.map(t=>{
    const m=MATERIALS[materialIndex[t.category]];
    return `<div class="todo-row ${t.done?'done':''}"><button type="button" class="todo-toggle" data-action="toggle-todo" data-id="${esc(t.id)}" aria-label="${t.done?'완료 취소':'완료'}: ${esc(t.text)}" aria-pressed="${t.done}">${t.done?icon('check'):''}</button><div class="todo-content"><div class="todo-text">${esc(t.text)}</div><div class="todo-category"><span class="dot" style="--color:${m.color}"></span>${m.name} · ${m.field}${d.todoRewards.includes(m.id)?' · 오늘 보상 받음':''}</div></div><div class="todo-actions">${iconButton('edit','edit-todo',`할 일 수정: ${t.text}`,`data-id="${esc(t.id)}"`)}${iconButton('close','delete-todo',`할 일 삭제: ${t.text}`,`data-id="${esc(t.id)}"`)}</div></div>`;
  }).join(''):'<div class="empty">오늘은 어떤 작은 일을 해 볼까요?<br>아래에서 첫 할 일을 추가해 보세요.</div>'}</div><form id="todo-add" class="quick-add"><label class="sr-only" for="quick-todo">새 할 일 *</label><input id="quick-todo" name="text" placeholder="작은 할 일 하나 추가하기" maxlength="80" required value="${esc(ui.todoText)}" autocomplete="off"><button class="add-btn" type="submit" aria-label="할 일 추가">${icon('plus')}</button><label class="sr-only" for="quick-category">할 일 분야</label><select id="quick-category" name="category" class="category-select">${MATERIALS.map(m=>`<option value="${m.id}" ${ui.todoCategory===m.id?'selected':''}>${m.name} · ${m.field}${d.todoRewards.includes(m.id)?' (오늘 보상 받음)':''}</option>`).join('')}</select></form><div class="reward-note">${icon('info')}<span>분야별 하루 첫 완료에 회색 광석 5개를 받아요.<br>오늘 할 일 보상 ${d.todoRewards.length} / 6회 · 하루 최대 30개</span></div></section>`;
}
function routinesPanel(s,d){return `<section class="panel" aria-labelledby="routine-title"><div class="panel-head"><div><h2 id="routine-title">익숙한 작은 습관</h2><p class="panel-sub">회색 광석 +5 · 오늘 ${d.routineRewards} / 2회</p></div>${iconButton('plus','add-routine','새 루틴 추가')}</div>${s.routines.length?s.routines.map((r,i)=>`<div class="routine-row ${d.routineDone[r.id]?'done':''}"><button type="button" class="routine-toggle" data-action="toggle-routine" data-id="${esc(r.id)}" aria-pressed="${!!d.routineDone[r.id]}" aria-label="${d.routineDone[r.id]?'완료 취소':'완료'}: ${esc(r.name)}"><span class="routine-symbol">${icon(d.routineDone[r.id]?'check':i%2?'moon':'sun')}</span><span class="grow"><span class="routine-name">${esc(r.name)}</span><span class="routine-description" style="display:block">${esc(r.description||'매일 나를 돌보는 시간')}</span></span></button>${iconButton('edit','edit-routine',`루틴 수정: ${r.name}`,`data-id="${esc(r.id)}"`)}</div>`).join(''):'<div class="empty">매일 반복하고 싶은 작은 습관을 추가해 보세요.</div>'}</section>`;}
function moodPanel(d){return `<section class="panel mood-panel" aria-labelledby="mood-title"><div class="panel-head"><h2 id="mood-title">오늘 마음의 날씨</h2><span class="tiny muted">나만 보는 기록</span></div><div class="mood-choices">${MOODS.map((m,i)=>`<button type="button" class="mood-choice ${d.mood===i?'active':''}" data-action="mood" data-index="${i}" aria-label="${m.name}" aria-pressed="${d.mood===i}">${icon(['rain','cloud','sun','moon'][i])}</button>`).join('')}</div><p class="mood-text">${d.mood===null?'지금의 마음은 어떤가요? 날씨를 골라 주세요.':MOODS[d.mood].text}</p></section>`;}
function todayPage(s,d){return `${heading('오늘도, 나의 속도로.','할 일을 하나씩, 나의 방도 조금씩.',`<div class="date-label">${icon('calendar')}${formatDate(dayKey(),{year:'numeric',month:'long',day:'numeric',weekday:'long'})}</div>`)}${!s.onboarded?`<section class="notice onboarding"><div><b>나의 작은 세계에 온 걸 환영해요.</b><p>작은 일 완료 → 광석 모으기 → 가구 제작 → 내 방에 배치하기.<br>매일 다 하지 않아도 괜찮아요. 기본 할 일은 자유롭게 바꿔 보세요.</p></div><button type="button" class="btn outline" data-action="onboard">알겠어요</button></section>`:''}<div class="dashboard"><div class="stack">${roomPanel(s,d)}${!s.book.handled?`<section class="discovery" aria-labelledby="book-title"><span class="discovery-icon" aria-hidden="true"></span><div class="grow"><h3 id="book-title">방 한구석에서, 낡은 노트를 발견했어요.</h3><p>누군가의 작은 하루가 담겨 있을까요? · 한 번뿐인 발견</p></div><div class="discovery-actions"><button type="button" class="btn" data-action="take-book">주워 보기 · 회색 +5</button><button type="button" class="text-link" data-action="leave-book">그냥 두기</button></div></section>`:''}<div class="two-columns">${routinesPanel(s,d)}${moodPanel(d)}</div></div><div class="stack">${focusPanel(s,d)}${todoPanel(d)}</div></div>`;}
function inventoryPanel(s){const room=ui.editing?ui.roomDraft:s.room;const owned=ITEMS.filter(i=>room.inventory[i.id]);return `<section class="panel"><div class="panel-head"><div><h2>나의 보관함</h2><p class="panel-sub">${ui.editing?'가구를 골라 방의 빈칸에 놓아 주세요.':'방 편집을 눌러 가구를 배치해 보세요.'}</p></div><span class="pill">${Object.values(room.inventory).reduce((a,b)=>a+b,0)}개</span></div>${owned.length?`<div class="inventory">${owned.map(i=>`<button type="button" class="inventory-item ${ui.selectedItem===i.id?'active':''}" data-action="select-item" data-id="${i.id}" aria-pressed="${ui.selectedItem===i.id}"><span class="furniture-swatch" style="--item-color:${i.color}"></span><span><span class="inventory-name">${i.name}</span><span class="inventory-count" style="display:block">${room.inventory[i.id]}개 보관 중</span></span></button>`).join('')}</div>`:'<div class="empty">아직 보관 중인 가구가 없어요.<br>작업대에서 첫 가구를 만들어 보세요.</div>'}</section>`;}
function roomPage(s,d){return `${heading('내 취향이 머무는 곳.','오늘의 광석으로, 나만의 작은 방을 가꾸어요.')}<div class="room-layout"><div class="stack">${roomPanel(s,d,true)}${inventoryPanel(s)}<div class="notice tiny">가구는 광석으로만 만들어요. 회수할 때 재료로 돌아가지 않고, 보관함에 가구로 남아요. 배치 변경은 ‘배치 저장’을 누를 때 적용돼요.</div></div><div class="stack">${crafting(s)}</div></div>`;}
function togetherDays(s){const a=new Date(`${s.createdOn}T00:00:00`),b=new Date(`${dayKey()}T00:00:00`);return Math.max(1,Math.round((Date.UTC(b.getFullYear(),b.getMonth(),b.getDate())-Date.UTC(a.getFullYear(),a.getMonth(),a.getDate()))/86400000)+1);}

const {resources,focusPanel,crafting,recordsPage,collectionPage}=createOreViews({icon,esc,ui,heading,togetherDays,getInstall:()=>({status:installStatus,available:!!installPrompt})});

function render(){
  const s=Store.view();
  if(!s){renderRecovery();return;}
  const active=document.activeElement,focusId=active?.id,selection=active&&'selectionStart'in active?{start:active.selectionStart,end:active.selectionEnd}:null;
  const focusSelector=active?.dataset.action?['action','id','slot','index'].filter(k=>active.dataset[k]!==undefined).map(k=>`[data-${k}="${CSS.escape(active.dataset[k])}"]`).join(''):null;
  const date=dayKey(),d=s.days[date];lastDate=date;
  if(ui.editing&&ui.roomBase!==JSON.stringify(s.room)){
    ui.roomStatus='다른 창에서 방이 바뀌었어요. 현재 편집을 취소하고 다시 시작해 주세요.';
  }
  const pages={today:()=>todayPage(s,d),room:()=>roomPage(s,d),records:()=>recordsPage(s),collection:()=>collectionPage(s,d)};
  $('#app').innerHTML=layout(pages[ui.route](),s);
  $('.brand-title')?.setAttribute('translate','no');
  decorateForms($('#app'));
  document.title=`${routes.find(([r])=>r===ui.route)[1]} · QUIET WORLD`;
  if(focusId){const el=document.getElementById(focusId);if(el){el.focus({preventScroll:true});if(selection&&el.setSelectionRange&&selection.start!==null){try{el.setSelectionRange(selection.start,selection.end);}catch{}}}}
  else if(focusSelector&&!$('#modal').open)$(focusSelector)?.focus({preventScroll:true});
  lastRev=s.rev;
}
function download(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name.replaceAll('백업','backup').replaceAll('이전기록','legacy').replaceAll('복원전','before-restore').replaceAll('원본보관','recovery');document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function renderRecovery(){
  const {legacy,fault}=Store.load(),isLegacy=legacy&&Object.keys(legacy).length;
  $('#app').innerHTML=`<main class="recovery" id="main"><span class="brand-mark" aria-hidden="true"></span><h1>${isLegacy?'작은 세계를 새롭게 이어가요.':'기록을 안전하게 확인해야 해요.'}</h1><p>${isLegacy?'이전 버전의 기록을 발견했어요. 원본을 먼저 백업한 뒤 새 규칙으로 이어갈 수 있어요. 기존 조각은 대응 색 광석의 10배로, 가구 비용도 10배로 바꿔요. 보유 가구는 유지해요.':esc(fault||'기록을 읽지 못했어요. 원본을 내려받고 백업 파일을 복원해 주세요.')}</p>${isLegacy?`<div class="migration-summary">${Object.keys(legacy).length}개의 이전 저장 항목이 있어요.<br>기존 할 일·기분·활동·집중 시간·가구를 가능한 범위에서 옮겨요. 이전 집중은 종료한 상태로 옮기며 보상을 소급해 지급하지 않아요. 노트 배지는 영구 수집으로 분리돼요.</div><div class="row wrap"><button type="button" class="btn outline" data-action="legacy-backup">${icon('download')} 이전 기록 먼저 백업</button><button type="button" class="btn primary" data-action="migrate" ${!ui.legacyBacked?'disabled':''}>새로운 방으로 이어가기</button></div>`:`<div class="row wrap"><button type="button" class="btn outline" data-action="raw-backup">${icon('download')} 원본 보관하기</button><button type="button" class="btn primary" data-action="import">백업으로 복원</button></div><p class="tiny">내용을 임의로 지우지 않았어요. 원본 보관 파일은 복구를 위해 남겨 주세요.</p>`}<div class="notice section-gap error" id="recovery-error" role="alert"></div></main>`;
}
function decorateForms(root){
  root.querySelectorAll('input,textarea,select').forEach(el=>{if(!el.name)el.name=el.id;if(el.tagName!=='SELECT')el.autocomplete='off';if(el.placeholder&&!el.placeholder.endsWith('…'))el.placeholder+='…';});
  const date=root.querySelector('#record-date');
  if(date&&date.type==='date'){
    const wrapper=document.createElement('div');wrapper.className='record-date-control';date.before(wrapper);wrapper.append(date);
    date.type='text';date.inputMode='numeric';date.placeholder='예: 2026-11-13';date.pattern='[0-9]{4}-[0-9]{2}-[0-9]{2}';date.setAttribute('aria-label','기록 날짜, 연도-월-일');
    const native=document.createElement('input');native.type='date';native.id='native-record-date';native.name='calendar';native.value=date.value;native.max=dayKey();native.min='1900-01-01';native.tabIndex=-1;native.setAttribute('aria-hidden','true');
    const button=document.createElement('button');button.type='button';button.className='btn outline';button.dataset.action='open-calendar';button.setAttribute('aria-label','기록 날짜 달력 열기');button.innerHTML=icon('calendar');
    wrapper.append(button,native);
  }
}
function openModal(title,content){const modal=$('#modal');modal.innerHTML=`<button type="button" class="icon-btn close-modal" data-action="close-modal" aria-label="닫기">${icon('close')}</button><h2 id="modal-title">${title}</h2>${content}`;decorateForms(modal);modal.showModal();}
function closeModal(){const modal=$('#modal');if(modal.open)modal.close();ui.pendingImport=null;}
function confirmModal(title,text,action,extra=''){openModal(title,`<div class="dialog-form"><p>${text}</p><div id="dialog-error" class="notice error section-gap" role="alert"></div><div class="row">${btn('취소','close-modal')}<button type="button" class="btn primary" data-action="${action}" ${extra}>계속하기</button></div></div>`);}
function todoModal(s,id){const t=s.days[dayKey()].todos.find(t=>t.id===id);if(!t)return;openModal('작은 일 바꾸기',`<form id="edit-todo-form" class="dialog-form" data-id="${esc(id)}"><label for="edit-todo-text">할 일 *</label><input id="edit-todo-text" name="text" maxlength="80" required value="${esc(t.text)}"><label for="edit-todo-category">할 일 분야</label><select id="edit-todo-category" name="category">${MATERIALS.map(m=>`<option value="${m.id}" ${t.category===m.id?'selected':''}>${m.name} · ${m.field}</option>`).join('')}</select><p>분야를 바꿔도 이미 완료한 일의 보상을 다시 주지는 않아요. 이후 완료할 때 해당 분야의 남은 한도를 적용해요.</p><div id="dialog-error" class="notice error section-gap" role="alert"></div><div class="row">${btn('취소','close-modal')}<button type="submit" class="btn primary">저장</button></div></form>`);}
function routineModal(s,id=null){const r=s.routines.find(r=>r.id===id);if(id&&!r)return;openModal(r?'습관 다듬기':'새로운 작은 습관',`<form id="routine-form" class="dialog-form" data-id="${esc(id||'')}"><label for="routine-name">루틴 이름 *</label><input id="routine-name" name="name" maxlength="32" required value="${esc(r?.name||'')}" placeholder="예: 저녁 산책"><label for="routine-desc">설명</label><input id="routine-desc" name="description" maxlength="80" value="${esc(r?.description||'')}" placeholder="매일 반복하고 싶은 작은 행동"><p>각 루틴은 하루 한 번 회색 광석 5개, 모두 합쳐 하루 10개까지 받아요. 설명의 행동들은 한 묶음으로 완료해요.</p><div id="dialog-error" class="notice error section-gap" role="alert"></div><div class="row">${r?`<button type="button" class="btn danger" data-action="delete-routine" data-id="${esc(id)}">삭제</button>`:''}${btn('취소','close-modal')}<button type="submit" class="btn primary">저장</button></div></form>`);}
function beginEdit(){const s=Store.current();ui.editing=true;ui.roomBase=JSON.stringify(s.room);ui.roomDraft=structuredClone(s.room);ui.selectedItem=null;ui.selectedSlot=null;ui.roomStatus='편집 중이에요. 배치 저장 전에는 기존 방이 바뀌지 않아요.';}
function endEdit(){ui.editing=false;ui.roomDraft=null;ui.roomBase=null;ui.selectedItem=null;ui.selectedSlot=null;}
async function submitOperation(op,message,close=false){const ok=await perform(()=>Store.transact(op),message);if(ok&&close)closeModal();else if(!ok&&$('#dialog-error'))$('#dialog-error').textContent=$('#toast').textContent;return ok;}

document.addEventListener('click',async event=>{
  const el=event.target.closest('[data-action]');if(!el||el.disabled)return;
  const action=el.dataset.action,id=el.dataset.id,s=Store.current();
  if(action==='close-modal'){closeModal();return;}
  if(action==='open-calendar'){try{$('#native-record-date').showPicker();}catch{$('#record-date')?.focus();toast('날짜를 2026-11-13처럼 입력해 주세요.');}return;}
  if(action==='legacy-backup'){try{download(Store.exportBackup(),`quiet-world-이전기록-${dayKey()}.json`);ui.legacyBacked=true;renderRecovery();}catch(e){toast(e.message,true);}return;}
  if(action==='raw-backup'){try{download(Store.rawBackup(),`quiet-world-원본보관-${dayKey()}.json`);toast('원본 보관 파일을 내려받았어요.');}catch(e){toast(e.message,true);}return;}
  if(action==='migrate'){await perform(()=>Store.initializeMigrated(),'이전 기록을 새 방으로 옮겼어요.');if(!Store.current()&&$('#recovery-error'))$('#recovery-error').textContent=$('#toast').textContent;return;}
  if(action==='import'){
    openModal('백업 파일 복원',`<form class="dialog-form" id="import-form"><p>복원하면 현재 기록 전체가 파일 내용으로 바뀌어요. 먼저 백업 파일을 확인해요. 최대 10MB까지 읽을 수 있어요.</p><label for="backup-file">QUIET WORLD 백업 파일 *</label><input id="backup-file" class="file-input" type="file" accept="application/json,.json" required><p>집중 중이라면 먼저 타이머를 쉬어 주세요. 파일 확인 중 다른 창에서 내용이 바뀌면 복원을 멈춰요.</p><div id="dialog-error" class="notice error section-gap" role="alert"></div><div class="row">${btn('취소','close-modal')}<button type="submit" class="btn primary">파일 내용 확인</button></div></form>`);return;
  }
  if(action==='confirm-restore'){
    if(!$('#restore-consent')?.checked){$('#dialog-error').textContent='현재 기록이 교체되는 것에 동의해 주세요.';return;}
    const backup=ui.pendingImport,raw=ui.pendingRaw;
    const ok=await perform(async()=>{
      download(Store.rawBackup(),`quiet-world-복원전-${dayKey()}-${Date.now()}.json`);
      await Store.restoreBackup(backup,raw);
    },'백업을 복원했어요. 타이머는 쉬는 상태로 이어져요.');
    if(ok){endEdit();ui.journalDrafts={};ui.todoText='';closeModal();render();}else if($('#dialog-error'))$('#dialog-error').textContent=$('#toast').textContent;return;
  }
  if(!s)return;
  if(action==='onboard'){await submitOperation(s=>s.onboarded=true);return;}
  if(action==='toggle-todo'){await submitOperation(s=>Store.operations.toggleTodo(s,id),'작은 일을 기록했어요.');return;}
  if(action==='edit-todo'){ui.dialogDate=dayKey();ui.dialogBase=JSON.stringify(s.days[dayKey()].todos.find(t=>t.id===id));todoModal(s,id);return;}
  if(action==='delete-todo'){const t=s.days[dayKey()]?.todos.find(t=>t.id===id);if(t)confirmModal('이 할 일을 지울까요?',`‘${esc(t.text)}’을 오늘 목록에서 지워요. 받은 광석과 오늘 보상 한도는 그대로예요.`,'confirm-delete-todo',`data-id="${esc(id)}"`);return;}
  if(action==='confirm-delete-todo'){await submitOperation(s=>Store.operations.deleteTodo(s,id),'할 일을 지웠어요.',true);return;}
  if(action==='toggle-routine'){await submitOperation(s=>Store.operations.toggleRoutine(s,id),'습관을 기록했어요.');return;}
  if(action==='add-routine'||action==='edit-routine'){ui.dialogBase=JSON.stringify(s.routines.find(r=>r.id===id));routineModal(s,action==='edit-routine'?id:null);return;}
  if(action==='delete-routine'){confirmModal('이 루틴을 지울까요?','반복 목록에서 지워요. 이미 남은 활동 기록과 오늘 보상 한도는 유지돼요.','confirm-delete-routine',`data-id="${esc(id)}"`);return;}
  if(action==='confirm-delete-routine'){await submitOperation(s=>Store.operations.deleteRoutine(s,id),'루틴을 지웠어요.',true);return;}
  if(['start-timer','pause-timer','stop-timer'].includes(action)){await submitOperation(s=>Store.operations.timer(s,action.split('-')[0]),action==='stop-timer'?'집중을 마쳤어요. 오늘 누적 시간은 그대로 남아요.':null);return;}
  if(action==='mood'){await submitOperation(s=>Store.operations.mood(s,Number(el.dataset.index)),'오늘의 마음을 남겼어요.');return;}
  if(action==='take-book'){await submitOperation(s=>Store.operations.book(s,true),'낡은 노트를 주웠어요. 회색 광석 +5');return;}
  if(action==='leave-book'){confirmModal('노트를 두고 갈까요?','한 번뿐인 발견이에요. 그냥 두면 다시 주울 수 없어요.','confirm-leave-book');return;}
  if(action==='confirm-leave-book'){await submitOperation(s=>Store.operations.book(s,false),'노트를 두고 왔어요.',true);return;}
  if(action==='craft'){if(ui.editing)return;await submitOperation(s=>Store.operations.craft(s,id),`${itemById[id].name}을 만들었어요. 보관함에서 골라 배치해 보세요.`);return;}
  if(action==='edit-room'){beginEdit();render();return;}
  if(action==='cancel-room'){endEdit();ui.roomStatus='편집을 취소했어요. 원래 배치가 유지돼요.';render();return;}
  if(action==='select-item'){
    if(!ui.editing)beginEdit();
    ui.selectedItem=ui.selectedItem===id?null:id;ui.selectedSlot=null;ui.roomStatus=ui.selectedItem?`${itemById[id].name}을 놓을 빈칸을 골라 주세요.`:'선택을 취소했어요.';render();return;
  }
  if(action==='tile'){
    if(!ui.editing)return;const slot=Number(el.dataset.slot),room=ui.roomDraft,placed=room.placed.find(p=>p.slot===slot);
    if(placed){ui.selectedSlot=ui.selectedSlot===slot?null:slot;ui.selectedItem=null;ui.roomStatus=ui.selectedSlot!==null?`${itemById[placed.itemId].name} 선택 · 빈칸으로 옮기거나 회수할 수 있어요.`:'선택을 취소했어요.';}
    else if(ui.selectedSlot!==null){const p=room.placed.find(p=>p.slot===ui.selectedSlot);p.slot=slot;ui.selectedSlot=null;ui.roomStatus='가구를 옮겼어요. 배치 저장을 눌러 마무리해 주세요.';}
    else if(ui.selectedItem&&room.inventory[ui.selectedItem]>0){room.inventory[ui.selectedItem]--;room.placed.push({slot,itemId:ui.selectedItem});ui.selectedItem=null;ui.roomStatus=room.placed.length===32?'방이 가득 찼어요. 다른 가구를 회수하면 새로 배치할 수 있어요.':'가구를 놓았어요. 배치 저장을 눌러 마무리해 주세요.';}
    else ui.roomStatus='보관함에서 가구를 먼저 골라 주세요.';
    render();return;
  }
  if(action==='recall'){
    const room=ui.roomDraft,p=room?.placed.find(p=>p.slot===ui.selectedSlot);if(!p)return;room.inventory[p.itemId]++;room.placed=room.placed.filter(x=>x.slot!==p.slot);ui.selectedSlot=null;ui.roomStatus='보관함으로 회수했어요. 배치 저장을 눌러 마무리해 주세요.';render();return;
  }
  if(action==='save-room'){
    const draft=structuredClone(ui.roomDraft),base=ui.roomBase;
    const ok=await submitOperation(s=>{if(JSON.stringify(s.room)!==base)throw new Error('다른 창에서 방이 바뀌었어요. 편집을 취소한 뒤 다시 시작해 주세요.');s.room=draft;Store.addLog(s,'나의 방 배치를 저장했어요.');},'나의 방을 저장했어요.');
    if(ok){endEdit();ui.roomStatus='배치를 저장했어요. 다음에 돌아와도 그대로 남아요.';render();}return;
  }
   if(action==='exchange-max'){ui.exchangeAmount=String(s.fragments[6]);render();return;}
   if(action==='confirm-exchange'){
     const request=ui.pendingExchange;if(!request)return;
     const ok=await submitOperation(s=>Store.operations.exchange(s,request),'광석을 교환했어요.',true);
     if(ok){ui.pendingExchange=null;ui.exchangeAmount='';render();}return;
   }
   if(action==='receipt-prev'||action==='receipt-next'){ui.receiptPage=Math.max(0,ui.receiptPage+(action==='receipt-next'?1:-1));render();return;}
   if(action==='record-date'){setRecordDate(el.dataset.date);return;}
  if(action==='export'){
    await perform(async()=>{await Store.transact(()=>{});download(Store.exportBackup(),`quiet-world-백업-${dayKey()}.json`);},'내 기록 백업 파일을 내려받았어요.');return;
  }
  if(action==='install'){
    if(!installPrompt){toast('브라우저 메뉴에서 홈 화면에 추가를 선택해 주세요.');return;}
    try{await installPrompt.prompt();const result=await installPrompt.userChoice;installStatus=result.outcome==='accepted'?'홈 화면에 설치했어요.':'설치는 나중에 다시 할 수 있어요.';installPrompt=null;render();}catch{toast('설치를 시작하지 못했어요. 브라우저 메뉴에서 다시 시도해 주세요.',true);}return;
  }
});
document.addEventListener('input',e=>{
  if(e.target.id==='exchange-amount'){ui.exchangeAmount=e.target.value;updateExchangePreview();}
  if(e.target.id==='exchange-color'){ui.exchangeOre=e.target.value;updateExchangePreview();}
  if(e.target.id==='quick-todo')ui.todoText=e.target.value;
  if(e.target.id==='journal'){if(!(ui.recordDate in ui.journalDrafts))ui.journalBases[ui.recordDate]=Store.current()?.days[ui.recordDate]?.journal??'';ui.journalDrafts[ui.recordDate]=e.target.value;$('#journal-status').textContent=`${e.target.value.length.toLocaleString('ko-KR')} / 2,000자 · 아직 저장하지 않았어요.`;}
});
document.addEventListener('change',e=>{if(e.target.id==='quick-category')ui.todoCategory=e.target.value;if(['record-date','native-record-date'].includes(e.target.id))setRecordDate(e.target.value);});
function updateExchangePreview(){const n=Number(ui.exchangeAmount),balance=Store.current()?.fragments[6]??0;$('#exchange-preview').textContent=Number.isSafeInteger(n)&&n>0&&n<=balance?`회색 ${n.toLocaleString('ko-KR')}개 차감 → ${ORES[oreIndex[ui.exchangeOre]].name} ${n.toLocaleString('ko-KR')}개 지급`:'보유 잔액 안에서 1개 이상의 정수를 입력해 주세요.';}
function setRecordDate(date){if(!validDate(date)||date>dayKey()){toast('오늘 이전의 올바른 날짜를 골라 주세요.',true);return;}ui.recordDate=date;ui.receiptPage=0;const url=new URL(location.href);url.searchParams.set('date',date);history.replaceState(null,'',url);render();}
document.addEventListener('submit',async e=>{
  const form=e.target;e.preventDefault();const data=new FormData(form);
  if(form.id==='exchange-form'){
    const amount=Number(data.get('amount')),oreId=data.get('oreId'),s=Store.current();
    if(!Number.isSafeInteger(amount)||amount<=0||amount>s.fragments[6]||!Object.hasOwn(oreIndex,oreId)||oreId==='gray'){fieldError(form,'교환할 색과 보유 잔액 안의 정수 수량을 확인해 주세요.');return;}
    ui.pendingExchange={oreId,amount,expectedBalance:s.fragments[6]};
    openModal('이 광석으로 교환할까요?',`<div class="dialog-form"><p>회색 광석 ${amount.toLocaleString('ko-KR')}개를 차감하고, ${ORES[oreIndex[oreId]].name} 광석 ${amount.toLocaleString('ko-KR')}개를 받아요. 역교환은 할 수 없어요.</p><div id="dialog-error" class="notice error section-gap" role="alert"></div><div class="row">${btn('취소','close-modal')}<button type="button" class="btn primary" data-action="confirm-exchange">광석 교환</button></div></div>`);return;
  }
  if(form.id==='todo-add'){
    const text=data.get('text').trim(),category=data.get('category');if(!text){fieldError(form,'할 일을 한 글자 이상 적어 주세요.');return;}
    const ok=await submitOperation(s=>Store.operations.saveTodo(s,{text,category}),'새로운 작은 일을 추가했어요.');if(ok){ui.todoText='';render();$('#quick-todo')?.focus();}return;
  }
  if(form.id==='edit-todo-form'){await submitOperation(s=>{if(dayKey()!==ui.dialogDate)throw new Error('날짜가 바뀌었어요. 창을 닫고 오늘 할 일을 다시 골라 주세요.');if(JSON.stringify(s.days[dayKey()].todos.find(t=>t.id===form.dataset.id))!==ui.dialogBase)throw new Error('다른 창에서 이 할 일이 바뀌었어요. 창을 닫고 다시 수정해 주세요.');Store.operations.saveTodo(s,{id:form.dataset.id,text:data.get('text'),category:data.get('category')});},'할 일을 바꿨어요.',true);return;}
  if(form.id==='routine-form'){await submitOperation(s=>{if(form.dataset.id&&JSON.stringify(s.routines.find(r=>r.id===form.dataset.id))!==ui.dialogBase)throw new Error('다른 창에서 루틴이 바뀌었어요. 창을 닫고 다시 수정해 주세요.');Store.operations.saveRoutine(s,{id:form.dataset.id||null,name:data.get('name'),description:data.get('description')});},'습관을 저장했어요.',true);return;}
  if(form.id==='journal-form'){
    const date=ui.recordDate,text=data.get('journal'),base=ui.journalBases[date]??Store.current()?.days[date]?.journal??'';const ok=await submitOperation(s=>{if((s.days[date]?.journal??'')!==base)throw new Error('다른 창에서 이 회고가 바뀌었어요. 쓴 내용을 따로 보관하고 화면을 다시 열어 주세요.');Store.operations.journal(s,date,text);},'나에게 남긴 한 줄을 저장했어요.');if(ok){delete ui.journalDrafts[date];delete ui.journalBases[date];render();}return;
  }
  if(form.id==='import-form'){
    try{
      const file=$('#backup-file').files[0];if(!file)throw new Error('백업 파일을 골라 주세요.');if(file.size>10*1024*1024)throw new Error('파일이 너무 커요. 10MB 이하의 백업을 골라 주세요.');
      const backup=Store.parseBackup(JSON.parse(await file.text()));ui.pendingImport=backup;ui.pendingRaw=localStorage.getItem(Store.STATE_KEY);
      const days=Object.keys(backup.days).sort(),furniture=Object.values(backup.room.inventory).reduce((a,b)=>a+b,0)+backup.room.placed.length;
      openModal('이 기록으로 바꿀까요?',`<div class="dialog-form"><p>파일을 확인했어요. 아래 내용으로 현재 기록 전체를 교체해요.</p><div class="preview-summary">기록한 날짜 ${days.length.toLocaleString('ko-KR')}일<br>기간 ${esc(days[0]||'없음')} ~ ${esc(days.at(-1)||'없음')}<br>광석 합계 ${backup.fragments.reduce((a,b)=>a+b,0)}개 · 가구 ${furniture}개<br>첫 이용일 ${backup.createdOn}</div><p>현재 기록은 교체 직전에 자동으로 백업해요. 파일 속 타이머는 쉬는 상태로 복원해요. 내려받기 허용 여부를 확인해 주세요.</p><label class="check-label"><input type="checkbox" id="restore-consent">현재 기록 전체가 이 파일 내용으로 바뀌는 것에 동의해요.</label><div id="dialog-error" class="notice error section-gap" role="alert"></div><div class="row">${btn('취소','close-modal')}<button type="button" class="btn primary" data-action="confirm-restore">현재 기록 교체</button></div></div>`);
    }catch(error){$('#dialog-error').textContent=error instanceof SyntaxError?'파일을 읽지 못했어요. 올바른 JSON 백업 파일을 골라 주세요.':error.message;}
  }
});
window.addEventListener('hashchange',()=>{
  const next=getRoute();
  if(ui.editing&&next!=='room'){
    location.hash='room';
    openModal('아직 저장하지 않은 배치가 있어요.',`<div class="dialog-form"><p>방 편집에서 배치를 저장하거나 취소한 뒤 다른 화면으로 이동해 주세요.</p><div class="row">${btn('편집으로 돌아가기','close-modal')}</div></div>`);return;
  }
  ui.route=next;render();window.scrollTo({top:0,behavior:'instant'});
});
window.addEventListener('beforeunload',e=>{if(ui.editing||Object.keys(ui.journalDrafts).some(d=>ui.journalDrafts[d]!==Store.current()?.days[d]?.journal)){e.preventDefault();e.returnValue='';}});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;render();});
window.addEventListener('appinstalled',()=>{installPrompt=null;installStatus='홈 화면에 설치했어요.';render();});
Store.subscribe(e=>{if(e.detail?.quiet)liveClock();else render();});
function liveClock(){
  const c=Store.clockView();if(!c)return;
  if(lastOre!==oreAt()){lastOre=oreAt();render();}
  if($('#timer-number'))$('#timer-number').textContent=clock(c.sessionMs);
  if($('#focus-total'))$('#focus-total').textContent=`${Math.floor(c.focusMs/60000)}분`;
  if($('#focus-fill'))$('#focus-fill').style.width=`${c.remainderMs/CYCLE_MS*100}%`;
  if($('#next-reward'))$('#next-reward').textContent=clock(CYCLE_MS-c.remainderMs).slice(-5);
  if($('#focus-progress'))$('#focus-progress').setAttribute('aria-valuenow',String(Math.floor(c.remainderMs/1000)));
  if($('#current-ore')&&$('#current-ore').dataset.ore!==oreAt())render();
  if(ui.recordDate===c.date&&$('#record-focus'))$('#record-focus').textContent=`${Math.floor(c.focusMs/60000)}분`;
}
async function checkpoint(force=false){
  const c=Store.clockView();if(!c||busyTick||ui.busy)return;
  const due=force||lastDate!==c.date||(c.running&&(Date.now()-c.checkpoint>=15000||c.rewardDue));
  if(due){busyTick=true;try{await Store.transact(()=>{},null,{quiet:true});}catch(e){toast(e.message,true);}finally{busyTick=false;}}
}
setInterval(()=>{liveClock();checkpoint();},1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkpoint(true);});
window.addEventListener('focus',()=>checkpoint());
render();
if(boot.state)checkpoint(true);
if('serviceWorker'in navigator){
  window.addEventListener('load',async()=>{
    try{const registration=await navigator.serviceWorker.register('./service-worker.js');await navigator.serviceWorker.ready;installStatus='오프라인 준비를 마쳤어요. 연결 없이도 작은 세계를 이어가요.';if($('#install-status'))$('#install-status').textContent=installStatus;
      registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)toast('새 버전이 준비됐어요. 편집을 저장한 뒤 다시 열면 적용돼요.');});});
    }catch{installStatus='오프라인 준비를 마치지 못했어요. 연결 상태를 확인하고 다시 열어 주세요.';if($('#install-status'))$('#install-status').textContent=installStatus;}
  });
}
