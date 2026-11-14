import {ITEMS,ORES,oreIndex,CYCLE_MS,itemById,materialIndex,dayKey,validDate,freshDay,freshState,uid} from './game-data.js';
import {applyElapsed} from './ore-rewards.js';
import {validateV2,upgradeV2,migrateOriginal} from './legacy-migration.js';

export const STATE_KEY='quiet-world:app-v2';
const MIGRATION_KEY='quiet-world:before-ore-v3';
const clone=value=>structuredClone(value);
const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const count=n=>Number.isSafeInteger(n)&&n>=0;
const str=(s,max)=>typeof s==='string'&&s.length<=max;
const assert=(condition)=>{if(!condition)throw new Error('저장 내용의 형식을 확인할 수 없어요. 원본을 백업하고 다른 백업 파일로 복원해 주세요.');};
export function validate(s) {
  assert(object(s)&&s.version===3&&count(s.rev)&&validDate(s.createdOn)&&typeof s.onboarded==='boolean');
  assert(Array.isArray(s.fragments)&&s.fragments.length===7&&s.fragments.every(count));
  assert(object(s.oreClock)&&count(s.oreClock.nextIndex)&&count(s.oreClock.remainderMs)&&s.oreClock.remainderMs<CYCLE_MS&&typeof s.oreClock.seed==='string'&&/^[a-f0-9]{32}$/.test(s.oreClock.seed));
  assert(object(s.book)&&typeof s.book.handled==='boolean'&&typeof s.book.picked==='boolean'&&(!s.book.picked||s.book.handled));
  assert(Array.isArray(s.routines)&&s.routines.length<=1000);
  const ids=new Set();
  s.routines.forEach(r=>{assert(object(r)&&str(r.id,100)&&r.id.length&&str(r.name,32)&&r.name.trim()&&str(r.description,80)&&!ids.has(r.id)&&!['__proto__','constructor','prototype'].includes(r.id));ids.add(r.id);});
  assert(object(s.room)&&object(s.room.inventory)&&Array.isArray(s.room.placed)&&s.room.placed.length<=32);
  assert(Object.keys(s.room.inventory).length===4&&ITEMS.every(i=>count(s.room.inventory[i.id])));
  const slots=new Set();s.room.placed.forEach(p=>{assert(object(p)&&Number.isInteger(p.slot)&&p.slot>=0&&p.slot<32&&own(itemById,p.itemId)&&!slots.has(p.slot));slots.add(p.slot);});
  assert(object(s.timer)&&typeof s.timer.running==='boolean'&&count(s.timer.sessionMs));
  assert((s.timer.checkpoint===null||count(s.timer.checkpoint))&&(s.timer.startedAt===null||count(s.timer.startedAt))&&(!s.timer.running||(s.timer.checkpoint!==null&&s.timer.startedAt!==null)));
  assert(object(s.days)&&Object.keys(s.days).length<=20000);
  const receipts=new Set();
  for(const [date,d] of Object.entries(s.days)) {
    assert(validDate(date)&&object(d)&&Array.isArray(d.todos)&&d.todos.length<=1000);
    const todos=new Set();d.todos.forEach(t=>{assert(object(t)&&str(t.id,100)&&t.id.length&&!todos.has(t.id)&&str(t.text,80)&&t.text.trim()&&own(materialIndex,t.category)&&typeof t.done==='boolean');todos.add(t.id);});
    assert(object(d.routineDone)&&object(d.routineRewarded)&&Object.values(d.routineDone).every(v=>typeof v==='boolean')&&Object.values(d.routineRewarded).every(v=>typeof v==='boolean'));
    assert(Array.isArray(d.todoRewards)&&new Set(d.todoRewards).size===d.todoRewards.length&&d.todoRewards.every(x=>own(materialIndex,x)));
    assert(count(d.routineRewards)&&d.routineRewards<=2&&count(d.focusRewards)&&count(d.focusMs));
    assert(count(d.grayEarned)&&d.grayEarned<=45&&d.grayEarned%5===0&&count(d.legacyRewardCount)&&Array.isArray(d.oreRewards)&&d.focusRewards===d.oreRewards.length);
    for(const r of d.oreRewards){assert(object(r)&&count(r.index)&&r.index<s.oreClock.nextIndex&&!receipts.has(r.index)&&count(r.at)&&r.at<=8640000000000000&&own(oreIndex,r.oreId)&&r.oreId!=='gray'&&Number.isInteger(r.amount)&&r.amount>=5&&r.amount<=25&&typeof r.time==='string'&&/^\d{2}:\d{2}:\d{2}$/.test(r.time));receipts.add(r.index);}
    assert(d.mood===null||(Number.isInteger(d.mood)&&d.mood>=0&&d.mood<4));
    assert(str(d.journal,2000)&&Array.isArray(d.logs)&&d.logs.length<=100);
    d.logs.forEach(l=>assert(object(l)&&str(l.time,40)&&str(l.text,300)));
    assert(Array.isArray(d.badges)&&d.badges.every(x=>['task','routine','focus'].includes(x)));
  }
  assert(receipts.size===s.oreClock.nextIndex);
  return s;
}
export function ensureDay(s,date=dayKey()) {return s.days[date]??(s.days[date]=freshDay());}
export function addLog(s,text,date=dayKey(),now=Date.now()) {
  const d=ensureDay(s,date);d.logs.unshift({time:new Date(now).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false}),text});d.logs=d.logs.slice(0,100);
}
export function badges(s,date) {
  const d=ensureDay(s,date);
  for(const [id,ok] of [['task',d.todos.some(t=>t.done)],['routine',Object.values(d.routineDone).some(Boolean)],['focus',d.focusMs>=1500000]])if(ok&&!d.badges.includes(id))d.badges.push(id);
}
export function settle(s,now=Date.now()) {
  const t=s.timer;
  if(t.running) {
    let cursor=t.checkpoint;
    if(now<cursor)return;
    applyElapsed(s,cursor,now,ensureDay,addLog);
    t.checkpoint=now;
  }
  ensureDay(s,dayKey(now));
}
function legacyEntries() {
  const out={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k.startsWith('quiet-world:')&&k!==MIGRATION_KEY&&k!=='quiet-world:before-v2')out[k]=localStorage.getItem(k);}return out;
}
export function migrate(entries,options={}) {
  assert(object(entries));
  if(entries[STATE_KEY]){const s=JSON.parse(entries[STATE_KEY]);return validate(s.version===2?upgradeV2(s,options):s);}
  return validate(migrateOriginal(entries,options));
}
let state=null, fault=null, legacy=null;
export function load() {
  fault=null;legacy=null;
  try {
    const raw=localStorage.getItem(STATE_KEY);
    if(raw){const saved=JSON.parse(raw);if(saved.version===2){validateV2(saved);state=null;legacy={[STATE_KEY]:raw};return {state:null,legacy,fault:null};}state=validate(saved);}
    else{legacy=legacyEntries();if(Object.keys(legacy).length){state=null;return {state:null,legacy,fault:null};}state=freshState();ensureDay(state);}
  }catch(e){fault=e instanceof SyntaxError?'저장된 기록을 읽지 못했어요. 원본을 보관한 뒤 정상적인 백업 파일로 복원해 주세요.':e.message;state=null;}
  return {state:state?clone(state):null,legacy,fault};
}
export function current(){return state?clone(state):null;}
export function clockView(now=Date.now()) {
  if(!state)return null;
  const date=dayKey(now),d=state.days[date],t=state.timer,start=new Date(now);start.setHours(0,0,0,0);
  const elapsed=t.running?Math.max(0,now-t.checkpoint):0;
  const todayElapsed=t.running?Math.max(0,now-Math.max(t.checkpoint,start.getTime())):0;
  return {date,running:t.running,checkpoint:t.checkpoint,sessionMs:t.sessionMs+elapsed,focusMs:(d?.focusMs??0)+todayElapsed,focusRewards:d?.focusRewards??0,remainderMs:(state.oreClock.remainderMs+elapsed)%CYCLE_MS,rewardDue:state.oreClock.remainderMs+elapsed>=CYCLE_MS};
}
export const subscribe=fn=>window.addEventListener('qw:update',fn);
function notify(quiet=false){window.dispatchEvent(new CustomEvent('qw:update',{detail:{quiet}}));}
function persist(next,quiet=false){validate(next);localStorage.setItem(STATE_KEY,JSON.stringify(next));state=next;fault=null;legacy=null;notify(quiet);}
async function exclusive(fn) {
  if(!navigator.locks)throw new Error('이 브라우저는 안전한 동시 저장을 지원하지 않아요. 최신 브라우저에서 열어 주세요.');
  return navigator.locks.request('quiet-world-v2-write',fn);
}
export async function transact(operation,expectedRev=null,options={}) {
  return exclusive(()=>{
    const raw=localStorage.getItem(STATE_KEY),next=raw?validate(JSON.parse(raw)):state?clone(state):null;
    if(!next)throw new Error('기록을 먼저 복원해 주세요.');
    if(expectedRev!==null&&next.rev!==expectedRev)throw new Error('다른 창에서 내용이 바뀌었어요. 최신 상태에서 다시 시도해 주세요.');
    const before=JSON.stringify([Object.keys(next.days),next.fragments,Object.values(next.days).map(d=>d.badges)]);
    settle(next);const result=operation(next);for(const d of Object.keys(next.days))badges(next,d);
    const after=JSON.stringify([Object.keys(next.days),next.fragments,Object.values(next.days).map(d=>d.badges)]);
    next.rev++;persist(next,options.quiet&&before===after);return result;
  }).catch(e=>{if(e.name==='QuotaExceededError'||e.name==='SecurityError')throw new Error('기록을 저장하지 못했어요. 저장 공간과 브라우저 설정을 확인하고 백업해 주세요. 변경은 적용하지 않았어요.');throw e;});
}
export async function initializeMigrated() {
  return exclusive(()=>{
    const existing=localStorage.getItem(STATE_KEY);if(existing&&JSON.parse(existing).version===3)throw new Error('다른 창에서 이미 이전했어요. 화면을 새로 열어 주세요.');
    const entries=legacyEntries(),next=migrate(entries,{live:true});
    localStorage.setItem(MIGRATION_KEY,JSON.stringify({format:'quiet-world-legacy',entries}));
    persist(next);
  });
}
export function exportBackup() {
  const loaded=load();
  if(loaded.state)return {format:'quiet-world-backup',version:3,exportedAt:new Date().toISOString(),state:loaded.state};
  return {format:'quiet-world-legacy',entries:legacyEntries()};
}
export function rawBackup(){const out={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k.startsWith('quiet-world:'))out[k]=localStorage.getItem(k);}return {format:'quiet-world-recovery',entries:out};}
export function parseBackup(data) {
  assert(object(data));
  if(data.format==='quiet-world-backup')return validate(data.state?.version===2?upgradeV2(data.state):data.state);
  if(data.format==='quiet-world-legacy')return migrate(data.entries);
  if(data.format==='quiet-world-recovery'){
    return migrate(data.entries);
  }
  throw new Error('QUIET WORLD 백업 파일이 아니에요. 올바른 파일을 골라 주세요.');
}
export async function restoreBackup(backup,expectedRaw) {
  return exclusive(()=>{
    if(localStorage.getItem(STATE_KEY)!==expectedRaw)throw new Error('파일 확인 중 다른 창에서 기록이 바뀌었어요. 파일을 다시 골라 주세요.');
    const next=validate(clone(backup));
    // A restored running timer is paused at its saved checkpoint: never award time spent inside a backup file.
    next.timer.running=false;next.timer.checkpoint=null;next.rev=Math.max(next.rev,state?.rev||0)+1;
    persist(next);
  });
}
export function view(now=Date.now()) {
  if(!state)return null;
  const s=clone(state);ensureDay(s,dayKey(now));
  const t=s.timer;
  if(t.running&&now>=t.checkpoint){let at=t.checkpoint;while(at<now){const end=new Date(at);end.setHours(24,0,0,0);const next=Math.min(now,end.getTime());ensureDay(s,dayKey(at)).focusMs+=next-at;t.sessionMs+=next-at;at=next;}t.checkpoint=now;s.oreClock.remainderMs=(s.oreClock.remainderMs+now-state.timer.checkpoint)%CYCLE_MS;}
  return s;
}
window.addEventListener('storage',e=>{if(e.key===STATE_KEY||e.key===null){load();notify();}});
export const operations={
  toggleTodo(s,id){const d=ensureDay(s),t=d.todos.find(t=>t.id===id);if(!t)throw new Error('할 일이 바뀌었어요. 다시 골라 주세요.');t.done=!t.done;
    if(t.done&&!d.todoRewards.includes(t.category)){d.todoRewards.push(t.category);s.fragments[6]+=5;d.grayEarned+=5;addLog(s,`회색 광석 +5 · ${t.text}`);}else addLog(s,`${t.done?'할 일 완료':'완료 취소'} · ${t.text}`);},
  saveTodo(s,{id,text,category}){if(!text.trim()||text.length>80||!own(materialIndex,category))throw new Error('할 일과 분야를 확인해 주세요.');const d=ensureDay(s),t=d.todos.find(t=>t.id===id);if(id&&!t)throw new Error('할 일이 삭제되었어요. 다시 추가해 주세요.');if(t){t.text=text.trim();t.category=category;}else{if(d.todos.length>=1000)throw new Error('오늘 할 일은 최대 1,000개까지 추가할 수 있어요.');d.todos.push({id:uid(),text:text.trim(),category,done:false});}addLog(s,`${t?'할 일 수정':'할 일 추가'} · ${text.trim()}`);},
  deleteTodo(s,id){const d=ensureDay(s),t=d.todos.find(t=>t.id===id);if(!t)return;d.todos=d.todos.filter(t=>t.id!==id);addLog(s,`할 일 삭제 · ${t.text}`);},
  toggleRoutine(s,id){const d=ensureDay(s),r=s.routines.find(r=>r.id===id);if(!r)throw new Error('루틴이 바뀌었어요. 다시 골라 주세요.');d.routineDone[id]=!d.routineDone[id];if(d.routineDone[id]&&!d.routineRewarded[id]){d.routineRewarded[id]=true;if(d.routineRewards<2){d.routineRewards++;s.fragments[6]+=5;d.grayEarned+=5;addLog(s,`회색 광석 +5 · ${r.name}`);}else addLog(s,`루틴 완료 · ${r.name} (오늘 보상 한도 도달)`);}else addLog(s,`${d.routineDone[id]?'루틴 완료':'루틴 완료 취소'} · ${r.name}`);},
  saveRoutine(s,{id,name,description}){if(!name.trim()||name.length>32||description.length>80)throw new Error('루틴 이름과 설명을 확인해 주세요.');const r=s.routines.find(r=>r.id===id);if(id&&!r)throw new Error('루틴이 삭제되었어요. 다시 추가해 주세요.');if(r)Object.assign(r,{name:name.trim(),description:description.trim()});else{if(s.routines.length>=1000)throw new Error('루틴은 최대 1,000개까지 추가할 수 있어요.');s.routines.push({id:uid(),name:name.trim(),description:description.trim()});}addLog(s,`${r?'루틴 수정':'루틴 추가'} · ${name.trim()}`);},
  deleteRoutine(s,id){const r=s.routines.find(r=>r.id===id);s.routines=s.routines.filter(r=>r.id!==id);if(r)addLog(s,`루틴 삭제 · ${r.name}`);},
  timer(s,action){const t=s.timer;if(action==='start'&&!t.running){t.running=true;t.checkpoint=Date.now();t.startedAt??=Date.now();addLog(s,'집중을 시작했어요.');}if(action==='pause'&&t.running){t.running=false;t.checkpoint=null;addLog(s,'집중을 잠깐 쉬어요.');}if(action==='stop'){t.running=false;t.checkpoint=null;t.sessionMs=0;t.startedAt=null;addLog(s,'집중을 마쳤어요. 오늘의 누적 시간은 남아 있어요.');}},
  mood(s,index){if(!Number.isInteger(index)||index<0||index>3)return;ensureDay(s).mood=index;addLog(s,'오늘의 기분을 기록했어요.');},
  journal(s,date,text){if(!validDate(date)||date>dayKey()||typeof text!=='string'||text.length>2000)throw new Error('날짜와 회고 내용을 확인해 주세요.');const d=s.days[date]??(s.days[date]=freshDay(false));d.journal=text;},
  book(s,picked){if(s.book.handled)return;s.book={handled:true,picked};if(picked){s.fragments[6]+=5;ensureDay(s).grayEarned+=5;}addLog(s,picked?'낡은 노트를 주웠어요. 회색 광석 +5':'낡은 노트를 두고 왔어요.');},
  craft(s,id){const item=itemById[id];if(!item)throw new Error('가구를 다시 골라 주세요.');if(!Object.entries(item.cost).every(([m,n])=>s.fragments[oreIndex[m]]>=n))throw new Error('재료가 부족해요. 집중하거나 회색 광석을 교환해 모아 주세요.');for(const [m,n] of Object.entries(item.cost))s.fragments[oreIndex[m]]-=n;s.room.inventory[id]++;addLog(s,`${item.name}을 만들었어요.`);},
  exchange(s,{oreId,amount,expectedBalance}){if(!own(oreIndex,oreId)||oreId==='gray'||!Number.isSafeInteger(amount)||amount<=0)throw new Error('교환할 색과 1개 이상의 정수 수량을 골라 주세요.');if(s.fragments[6]!==expectedBalance)throw new Error('다른 창에서 회색 잔액이 바뀌었어요. 수량을 다시 확인해 주세요.');if(s.fragments[6]<amount)throw new Error('회색 광석이 부족해요. 할 일이나 루틴으로 모아 주세요.');s.fragments[6]-=amount;s.fragments[oreIndex[oreId]]+=amount;addLog(s,`광석 교환 · 회색 ${amount} → ${ORES[oreIndex[oreId]].name} ${amount}`);},
};
