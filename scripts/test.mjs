import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require('/usr/local/lib/node_modules/playwright');
const browser=await chromium.launch({args:['--no-sandbox']});
const results=[];
const context=await browser.newContext({timezoneId:'Asia/Seoul',acceptDownloads:true});
const page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
page.setDefaultTimeout(10000);
const key='quiet-world:app-v2';
const read=async()=>{await page.waitForFunction(()=>!document.querySelector('#app').hasAttribute('aria-busy'));return page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);};
async function waitState(predicate){await page.waitForFunction(({key,predicate})=>{const state=JSON.parse(localStorage.getItem(key));return state&&new Function('s',`return (${predicate})(s)`)(state);},{key,predicate:String(predicate)});}
async function test(name,fn){await fn();results.push(name);console.log(`PASS ${name}`);}
try{
 await page.goto('http://localhost:5173');await waitState(s=>s.version===3);
 await test('처음 안내와 기본 할 일',async()=>{assert.equal(await page.locator('.todo-row').count(),6);await page.click('[data-action=onboard]');await waitState(s=>s.onboarded);});
 await test('사용자 할 일 보상, 취소 및 재완료 중복 방지',async()=>{
   await page.fill('#quick-todo','테스트 산책');await page.selectOption('#quick-category','vitality');await page.click('#todo-add button[type=submit]');await page.getByRole('button',{name:'완료: 테스트 산책',exact:true}).click();
    await waitState(s=>s.fragments[6]===5);await page.getByRole('button',{name:'완료 취소: 테스트 산책',exact:true}).click();await page.getByRole('button',{name:'완료: 테스트 산책',exact:true}).click();assert.equal((await read()).fragments[6],5);
    await page.getByRole('button',{name:'완료: 물 두 컵 마시기',exact:true}).click();assert.equal((await read()).fragments[6],5);
 });
 await test('할 일 수정과 삭제 확인',async()=>{
    await page.getByRole('button',{name:'할 일 수정: 테스트 산책',exact:true}).click();await page.fill('#edit-todo-text','테스트 걷기');await page.click('#edit-todo-form button[type=submit]');await page.getByRole('button',{name:'할 일 삭제: 테스트 걷기',exact:true}).click();assert.equal(await page.locator('dialog[open]').count(),1);await page.click('[data-action=confirm-delete-todo]');await read();assert.equal(await page.getByRole('button',{name:'완료 취소: 테스트 걷기',exact:true}).count(),0);assert.equal((await read()).fragments[6],5);
 });
 await test('기분과 루틴 저장 및 일일 보상 한도',async()=>{
   await page.getByRole('button',{name:'햇살 한 조각',exact:true}).click();await page.locator('[data-action=toggle-routine]').nth(0).click();await page.locator('[data-action=toggle-routine]').nth(1).click();
   await page.click('[data-action=add-routine]');await page.fill('#routine-name','테스트 습관');await page.fill('#routine-desc','매일 읽기');await page.click('#routine-form button[type=submit]');await page.getByRole('button',{name:'완료: 테스트 습관',exact:true}).click();
    const s=await read(),d=Object.values(s.days).at(-1);assert.equal(d.routineRewards,2);assert.equal(s.fragments[6],15);assert.equal(d.mood,2);
 });
  await test('가구 제작, 배치, 이동, 취소와 회수',async()=>{
    await page.evaluate(async()=>{const st=await import('/js/game-store.js');await st.transact(s=>{s.fragments[0]=10;s.fragments[3]=10;});});
   await page.locator('.navigation a[href="#room"]').click();await page.locator('[data-action=craft][data-id=plant]').click();assert.equal((await read()).room.inventory.plant,1);assert.equal((await read()).fragments[0],0);
   await page.locator('[data-action=select-item][data-id=plant]').click();await page.locator('[data-action=tile][data-slot="0"]').click();await page.click('[data-action=save-room]');assert.equal((await read()).room.placed[0].slot,0);
   await page.click('[data-action=edit-room]');await page.locator('[data-action=tile][data-slot="0"]').click();await page.locator('[data-action=tile][data-slot="3"]').click();await page.click('[data-action=cancel-room]');assert.equal((await read()).room.placed[0].slot,0);
   await page.click('[data-action=edit-room]');await page.locator('[data-action=tile][data-slot="0"]').click();await page.locator('[data-action=tile][data-slot="3"]').click();await page.click('[data-action=save-room]');assert.equal((await read()).room.placed[0].slot,3);
   await page.click('[data-action=edit-room]');await page.locator('[data-action=tile][data-slot="3"]').click();await page.click('[data-action=recall]');await page.click('[data-action=save-room]');assert.equal((await read()).room.inventory.plant,1);assert.equal((await read()).room.placed.length,0);
 });
 await test('회고 저장, 날짜 조회, 새로고침 유지',async()=>{
   await page.locator('.navigation a[href="#records"]').click();await page.fill('#journal','작은 일 하나가 기분을 바꿔 주었다.');await page.click('#journal-form button[type=submit]');await read();await page.reload();await page.waitForSelector('#journal');assert.equal(await page.inputValue('#journal'),'작은 일 하나가 기분을 바꿔 주었다.');
   await page.fill('#record-date','2020-01-02');await page.locator('#record-date').dispatchEvent('change');await page.waitForFunction(()=>document.querySelector('#journal').value==='');assert.match(await page.locator('.timeline,.empty').last().textContent(),/쉬어 간|활동/);
 });
 await test('백업 내려받기, 잘못된 파일 거부, 복원 미리보기 및 확인',async()=>{
   await page.locator('.navigation a[href="#collection"]').click();const event=page.waitForEvent('download');await page.click('[data-action=export]');const download=await event;assert.match(download.suggestedFilename(),/quiet-world-backup/);
   const saved=await read();await page.click('[data-action=import]');await page.setInputFiles('#backup-file',{name:'wrong.json',mimeType:'application/json',buffer:Buffer.from('{"wrong":true}')});await page.click('#import-form button[type=submit]');await page.waitForFunction(()=>document.querySelector('#dialog-error')?.textContent.length>0);assert.match(await page.locator('#dialog-error').textContent(),/아니에요|확인/);
   await page.setInputFiles('#backup-file',{name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'quiet-world-backup',state:saved}))});await page.click('#import-form button[type=submit]');await page.waitForSelector('#restore-consent');await page.check('#restore-consent');await page.click('[data-action=confirm-restore]');await page.waitForFunction(()=>!document.querySelector('dialog').open);assert.deepEqual((await read()).fragments,saved.fragments);
 });
 await test('집중 타이머 시작, 쉬기, 재개, 종료, 새로고침 복구',async()=>{
   await page.locator('.navigation a[href="#today"]').click();await page.click('[data-action=start-timer]');await waitState(s=>s.timer.running);await page.reload();await page.waitForSelector('[data-action=pause-timer]');await page.click('[data-action=pause-timer]');await waitState(s=>!s.timer.running&&s.timer.sessionMs>0);await page.click('[data-action=start-timer]');await page.click('[data-action=stop-timer]');await waitState(s=>!s.timer.running&&s.timer.sessionMs===0);
 });
  await test('집중 5분 경계와 중복 지급 방지',async()=>{
    await page.evaluate(async()=>{const st=await import('/js/game-store.js');await st.transact(s=>{s.oreClock.remainderMs=299000;s.timer.running=true;s.timer.checkpoint=Date.now()-2000;s.timer.startedAt=Date.now()-2000;});await st.transact(()=>{});});
    let state=await read();const today=await page.evaluate(async()=>{const d=await import('/js/game-data.js');return d.dayKey();});assert.equal(state.days[today].focusRewards,1);const balance=state.fragments;
    await page.evaluate(async()=>{const st=await import('/js/game-store.js');await st.transact(()=>{});});assert.deepEqual((await read()).fragments,balance);
   await page.click('[data-action=stop-timer]');
 });
 await test('기존 기록 이전 및 노트 영구 배지',async()=>{
   const legacyContext=await browser.newContext({timezoneId:'Asia/Seoul'}),p=await legacyContext.newPage();await p.goto('http://localhost:5173');await p.waitForFunction(k=>localStorage.getItem(k),key);
   await p.evaluate(k=>{localStorage.removeItem(k);localStorage.setItem('quiet-world:fragments',JSON.stringify({counts:[2,3,4,5,6,7],bookHandled:true,bookPicked:true}));localStorage.setItem('quiet-world:room',JSON.stringify({inventory:{plant:2,rug:0,lamp:0,bookshelf:0},placed:[{slot:2,itemId:'lamp'}]}));localStorage.setItem('quiet-world:todos:2026-01-01',JSON.stringify([{id:'vitality',text:'이전 기록',done:true,rewarded:true}]));},key);
    await p.reload();await p.waitForSelector('[data-action=legacy-backup]');await p.click('[data-action=legacy-backup]');await p.click('[data-action=migrate]');await p.waitForSelector('.dashboard');const state=await p.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);assert.deepEqual(state.fragments,[20,30,40,50,60,70,0]);assert.equal(state.room.placed[0].itemId,'lamp');assert.equal(state.createdOn,'2026-01-01');assert.equal(state.days['2026-01-01'].todos[0].text,'이전 기록');assert(state.book.picked);await legacyContext.close();
 });
 await test('여러 창 동시 제작은 잔액과 수량을 보존',async()=>{
    await page.evaluate(async()=>{const st=await import('/js/game-store.js');await st.transact(s=>{s.fragments[0]=10;s.fragments[3]=10;s.room.inventory.plant=0;});});
   const other=await context.newPage();await other.goto('http://localhost:5173/#room');await other.waitForSelector('.recipe');
   const outcome=await Promise.all([page,other].map(p=>p.evaluate(async()=>{const st=await import('/js/game-store.js');try{await st.transact(s=>st.operations.craft(s,'plant'));return 'ok';}catch{return 'blocked';}})));
   assert.deepEqual(outcome.sort(),['blocked','ok']);const s=await read();assert.equal(s.fragments[0],0);assert.equal(s.room.inventory.plant,1);await other.close();
 });
 await test('저장 공간 오류는 조각 차감과 가구 증가를 모두 취소',async()=>{
    await page.evaluate(async()=>{const st=await import('/js/game-store.js');await st.transact(s=>{s.fragments[0]=20;s.fragments[3]=20;});});const before=await read();
   const message=await page.evaluate(async()=>{const st=await import('/js/game-store.js'),original=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw new DOMException('full','QuotaExceededError');};try{await st.transact(s=>st.operations.craft(s,'plant'));return '';}catch(e){return e.message;}finally{Storage.prototype.setItem=original;}});assert.match(message,/저장하지 못/);assert.deepEqual(await read(),before);
 });
 await test('자정 집중 시간 분리와 새 날짜 할 일',async()=>{
    const result=await page.evaluate(async()=>{const {freshState,dayKey}=await import('/js/game-data.js'),{settle}=await import('/js/game-store.js');const s=freshState(),start=new Date('2026-11-12T23:50:00+09:00').getTime(),end=new Date('2026-11-13T00:30:00+09:00').getTime();s.timer={running:true,checkpoint:start,startedAt:start,sessionMs:0};settle(s,end);return {a:s.days[dayKey(start)],b:s.days[dayKey(end)],fragments:s.fragments};});assert.equal(result.a.focusMs,600000);assert.equal(result.b.focusMs,1800000);assert.equal(result.a.focusRewards,1);assert.equal(result.b.focusRewards,7);assert.equal(result.b.todos.length,6);
 });
 await test('손상된 저장 내용은 임의 삭제 없이 복구 화면',async()=>{
   const c=await browser.newContext(),p=await c.newPage();await p.goto('http://localhost:5173');await p.waitForFunction(k=>localStorage.getItem(k),key);await p.evaluate(k=>localStorage.setItem(k,'{broken'),key);await p.reload();await p.waitForSelector('.recovery');assert.equal(await p.evaluate(k=>localStorage.getItem(k),key),'{broken');await c.close();
 });
  await test('긴 집중의 무제한 지급과 자정 색 전환',async()=>{
    const result=await page.evaluate(async()=>{const {freshState,dayKey}=await import('/js/game-data.js'),{settle}=await import('/js/game-store.js');const s=freshState(),a=new Date('2026-11-12T22:30:00+09:00').getTime(),b=new Date('2026-11-13T01:00:00+09:00').getTime();s.timer={running:true,checkpoint:a,startedAt:a,sessionMs:0};settle(s,b);settle(s,b);return {a:s.days[dayKey(a)].focusRewards,b:s.days[dayKey(b)].focusRewards,total:s.oreClock.nextIndex};});assert.deepEqual(result,{a:17,b:13,total:30});
 });
 await test('보상 후 삭제·재생성과 반복 루틴 생성은 한도를 되돌리지 않음',async()=>{
    const result=await page.evaluate(async()=>{const {freshState,dayKey}=await import('/js/game-data.js'),{ensureDay,operations}=await import('/js/game-store.js');const s=freshState(),d=ensureDay(s);operations.toggleTodo(s,d.todos[0].id);operations.deleteTodo(s,d.todos[0].id);operations.saveTodo(s,{text:'다시 만든 일',category:'vitality'});operations.toggleTodo(s,d.todos.at(-1).id);for(let i=0;i<5;i++){operations.saveRoutine(s,{name:`루틴${i}`,description:''});const id=s.routines.at(-1).id;operations.toggleRoutine(s,id);operations.deleteRoutine(s,id);}return {gray:s.fragments[6],rewards:d.routineRewards};});assert.deepEqual(result,{gray:15,rewards:2});
 });
 await test('재료 부족 제작은 잔액과 가구를 바꾸지 않음',async()=>{
   const result=await page.evaluate(async()=>{const {freshState}=await import('/js/game-data.js'),{operations}=await import('/js/game-store.js');const s=freshState(),before=JSON.stringify(s);try{operations.craft(s,'plant');}catch(e){return {same:before===JSON.stringify(s),error:e.message};}});assert(result.same);assert.match(result.error,/재료가 부족/);
 });
 await test('다른 창의 방 변경을 오래된 편집으로 덮어쓸 수 없음',async()=>{
   await page.goto('http://localhost:5173/#room');await page.waitForSelector('[data-action=edit-room]');await page.click('[data-action=edit-room]');await page.evaluate(async()=>{const st=await import('/js/game-store.js');await st.transact(s=>{s.room.inventory.plant+=1;});});const before=await read();await page.click('[data-action=save-room]');await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('다른 창'));assert.deepEqual((await read()).room,before.room);await page.click('[data-action=cancel-room]');
 });
 await test('키보드 완료 뒤 조작 위치 유지',async()=>{
   await page.goto('http://localhost:5173/#today');await page.waitForSelector('.todo-toggle');const first=page.locator('.todo-toggle').first();await first.focus();await page.keyboard.press('Space');await read();assert(await page.evaluate(()=>document.activeElement?.classList.contains('todo-toggle')));
 });
 await test('32칸 가득 참 안내와 회수 및 빈 할 일 목록',async()=>{
   const original=await read();await page.evaluate(async()=>{const st=await import('/js/game-store.js');await st.transact(s=>{s.room.placed=Array.from({length:32},(_,slot)=>({slot,itemId:'plant'}));s.room.inventory.plant=1;st.ensureDay(s).todos=[];});});
   await page.goto('http://localhost:5173/#room');await page.waitForSelector('[data-action=edit-room]');await page.click('[data-action=edit-room]');assert.equal(await page.locator('.room-tile .room-object').count(),32);await page.locator('[data-action=tile][data-slot="0"]').click();await page.click('[data-action=recall]');await page.locator('[data-action=select-item][data-id=plant]').click();await page.locator('[data-action=tile][data-slot="0"]').click();assert.match(await page.locator('.room-status').textContent(),/가득 찼어요/);await page.click('[data-action=cancel-room]');
   await page.locator('.navigation a[href="#today"]').click();await page.waitForSelector('.todo-list .empty');assert.match(await page.locator('.todo-list .empty').textContent(),/첫 할 일/);assert.equal(await page.locator('.progress-numbers b').textContent(),'0%');
   await page.evaluate(async original=>{const st=await import('/js/game-store.js');await st.transact(s=>{s.room=original.room;st.ensureDay(s).todos=original.days[Object.keys(original.days).sort().at(-1)].todos;});},original);
 });
 await test('휴대폰 모든 화면 가로 넘침 없음',async()=>{
   for(const width of [390,320]){await page.setViewportSize({width,height:844});for(const r of ['today','room','records','collection']){await page.goto(`http://localhost:5173/#${r}`);await page.waitForSelector('.shell');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${r} ${width}`);}}
 });
 await test('오프라인 재방문과 조작',async()=>{
   await page.goto('http://localhost:5173');await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await page.waitForSelector('.dashboard');await context.setOffline(true);await page.reload();await page.waitForSelector('.dashboard');await page.getByRole('button',{name:'고요한 밤',exact:true}).click();await waitState(s=>Object.values(s.days).at(-1).mood===3);await context.setOffline(false);
 });
 assert.deepEqual(errors,[],'브라우저 오류');
 console.log(`\n${results.length}개 검사 통과`);
}finally{await browser.close();}
