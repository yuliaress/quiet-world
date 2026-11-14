import {MATERIALS,ITEMS,materialIndex,itemById,freshState,freshDay,freshOreClock,dayKey,validDate} from './game-data.js';
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const count=x=>Number.isSafeInteger(x)&&x>=0;
const text=(v,n)=>typeof v==='string'&&v.length<=n;
const check=ok=>{if(!ok)throw new Error('이전 기록을 읽을 수 없어요. 원본을 백업하고 정상적인 백업 파일을 골라 주세요.');};
export function validateV2(s){
  check(object(s)&&s.version===2&&count(s.rev)&&validDate(s.createdOn)&&typeof s.onboarded==='boolean'&&Array.isArray(s.fragments)&&s.fragments.length===6&&s.fragments.every(count));
  check(object(s.book)&&typeof s.book.handled==='boolean'&&typeof s.book.picked==='boolean'&&(!s.book.picked||s.book.handled));
  check(Array.isArray(s.routines)&&s.routines.length<=1000);const rids=new Set();
  for(const r of s.routines){check(object(r)&&text(r.id,100)&&r.id&&!['__proto__','constructor','prototype'].includes(r.id)&&!rids.has(r.id)&&text(r.name,32)&&r.name.trim()&&text(r.description,80));rids.add(r.id);}
  check(object(s.room)&&object(s.room.inventory)&&Object.keys(s.room.inventory).length===4&&ITEMS.every(i=>count(s.room.inventory[i.id]))&&Array.isArray(s.room.placed)&&s.room.placed.length<=32);const slots=new Set();
  for(const p of s.room.placed){check(object(p)&&Number.isInteger(p.slot)&&p.slot>=0&&p.slot<32&&own(itemById,p.itemId)&&!slots.has(p.slot));slots.add(p.slot);}
  check(object(s.timer)&&typeof s.timer.running==='boolean'&&count(s.timer.sessionMs)&&(s.timer.checkpoint===null||count(s.timer.checkpoint))&&(s.timer.startedAt===null||count(s.timer.startedAt))&&(!s.timer.running||(s.timer.checkpoint!==null&&s.timer.startedAt!==null)));
  check(object(s.days)&&Object.keys(s.days).length<=20000);
  for(const [date,d] of Object.entries(s.days)){
    check(validDate(date)&&object(d)&&Array.isArray(d.todos)&&d.todos.length<=1000);const ids=new Set();
    for(const t of d.todos){check(object(t)&&text(t.id,100)&&t.id&&!ids.has(t.id)&&text(t.text,80)&&t.text.trim()&&own(materialIndex,t.category)&&typeof t.done==='boolean');ids.add(t.id);}
    check(object(d.routineDone)&&object(d.routineRewarded)&&Object.values(d.routineDone).every(v=>typeof v==='boolean')&&Object.values(d.routineRewarded).every(v=>typeof v==='boolean'));
    check(Array.isArray(d.todoRewards)&&new Set(d.todoRewards).size===d.todoRewards.length&&d.todoRewards.every(x=>own(materialIndex,x))&&count(d.routineRewards)&&d.routineRewards<=2&&count(d.focusRewards)&&d.focusRewards<=2&&count(d.focusMs));
    check((d.mood===null||(Number.isInteger(d.mood)&&d.mood>=0&&d.mood<=3))&&text(d.journal,2000)&&Array.isArray(d.logs)&&d.logs.length<=100&&d.logs.every(l=>object(l)&&text(l.time,40)&&text(l.text,300))&&Array.isArray(d.badges)&&d.badges.every(b=>['task','routine','focus'].includes(b)));
  }
  return s;
}
function addOldElapsed(s,from,to){let cursor=from;while(cursor<to){const end=new Date(cursor);end.setHours(24,0,0,0);const next=Math.min(to,end.getTime()),date=dayKey(cursor);const d=s.days[date]??(s.days[date]=freshDay(false));d.focusMs+=next-cursor;s.timer.sessionMs+=next-cursor;cursor=next;}}
export function upgradeV2(input,{live=false}={}){
  const s=structuredClone(validateV2(input));
  if(live&&s.timer.running)addOldElapsed(s,s.timer.checkpoint,Date.now());
  s.version=3;s.fragments=s.fragments.map(n=>n*10);s.fragments.push(0);s.oreClock=freshOreClock();s.timer.running=false;s.timer.checkpoint=null;
  for(const d of Object.values(s.days)){d.legacyRewardCount=d.todoRewards.length+d.routineRewards+d.focusRewards;d.focusRewards=0;d.oreRewards=[];d.grayEarned=0;if(d.focusMs>=1500000&&!d.badges.includes('focus'))d.badges.push('focus');}
  return s;
}
export function migrateOriginal(entries,{live=false}={}){
  check(object(entries)&&Object.keys(entries).length<=100000);const parsed={};
  for(const [key,value] of Object.entries(entries)){check(key.startsWith('quiet-world:')&&text(value,20000000));parsed[key.slice(12)]=JSON.parse(value);}
  const s=freshState();s.version=2;s.fragments=[0,0,0,0,0,0];delete s.oreClock;let earliest=dayKey();
  for(const [key,v] of Object.entries(parsed)){
    const date=key.split(':')[1];if(!validDate(date))continue;if(date<earliest)earliest=date;const d=s.days[date]??(s.days[date]=freshDay(false));
    if(key.startsWith('todos:')){check(Array.isArray(v));d.todos=v.map(t=>({id:t.id,text:t.text,category:own(materialIndex,t.id)?t.id:'vitality',done:!!t.done}));d.todoRewards=[...new Set(v.filter(t=>t.rewarded&&own(materialIndex,t.id)).map(t=>t.id))];}
    if(key.startsWith('routine-checks:')){check(object(v)&&object(v.done)&&object(v.rewarded));d.routineDone=v.done;d.routineRewarded=v.rewarded;d.routineRewards=Math.min(2,Object.values(v.rewarded).filter(Boolean).length);}
    if(key.startsWith('focus-total:')){check(count(v));d.focusMs+=v*1000;}
    if(key.startsWith('mood:'))d.mood=v;
    if(key.startsWith('logs:'))d.logs=v;
    if(key.startsWith('badges:')){check(object(v));d.badges=Object.entries({'first-step':'task','deep-focus':'focus','daily-ritual':'routine'}).filter(([id])=>v[id]).map(([,id])=>id);}
    if(key.startsWith('timer:')){check(object(v)&&count(v.seconds)&&(v.startedAt===null||count(v.startedAt)));d.focusMs+=v.seconds*1000;if(live&&v.startedAt!==null)addOldElapsed(s,v.startedAt,Date.now());}
  }
  if(parsed.fragments){s.fragments=parsed.fragments.counts;s.book={handled:!!parsed.fragments.bookHandled,picked:!!parsed.fragments.bookPicked};}
  if(parsed.routines){check(Array.isArray(parsed.routines));s.routines=parsed.routines.map(r=>({id:r.id,name:r.name,description:r.description||''}));}
  if(parsed.room)s.room={inventory:Object.fromEntries(ITEMS.map(i=>[i.id,parsed.room.inventory?.[i.id]??0])),placed:parsed.room.placed};
  s.createdOn=earliest;
  for(const d of Object.values(s.days)){d.focusRewards=Math.min(2,Math.floor(d.focusMs/1500000));if(d.todos.some(t=>t.done)&&!d.badges.includes('task'))d.badges.push('task');if(Object.values(d.routineDone).some(Boolean)&&!d.badges.includes('routine'))d.badges.push('routine');}
  return upgradeV2(s);
}
