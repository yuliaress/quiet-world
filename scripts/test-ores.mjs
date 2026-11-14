import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('/usr/local/lib/node_modules/playwright');
const browser=await chromium.launch({args:['--no-sandbox']});
const context=await browser.newContext({timezoneId:'Asia/Seoul',acceptDownloads:true});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
page.setDefaultTimeout(10000);
const key='quiet-world:app-v2';let passed=0;
const test=async(name,fn)=>{await fn();console.log(`PASS ${name}`);passed++;};
const state=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
try{
  await page.goto('http://localhost:5173');await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k))?.version===3,key);
  await test('확률표의 500개 조합과 구간 내 균등 분배',async()=>{
    const histogram=await page.evaluate(async()=>{const {amountFromTickets}=await import('/js/ore-rewards.js');const h={};for(let i=0;i<100;i++)for(let j=0;j<5;j++){const n=amountFromTickets(i,j);h[n]=(h[n]??0)+1;}return h;});
    for(let i=5;i<=25;i++)assert.equal(histogram[i],i===25?25:i<10?10:i<15?20:i<20?45:20);
    assert.equal(Object.entries(histogram).reduce((n,[a,count])=>n+Number(a)*count,0)/500,16.4);
  });
  await test('추첨 재시도 일관성과 대량 표본 구간 비율',async()=>{
    const result=await page.evaluate(async()=>{const {drawAmount}=await import('/js/ore-rewards.js');const seed='1234567890abcdef1234567890abcdef',bands=[0,0,0,0,0];let same=true;for(let i=0;i<100000;i++){const n=drawAmount(seed,i);same&&=n===drawAmount(seed,i)&&n>=5&&n<=25;bands[n===25?4:n<10?3:n<15?1:n<20?0:2]++;}return {same,bands};});
    assert(result.same);[.45,.2,.2,.1,.05].forEach((p,i)=>assert(Math.abs(result.bands[i]/100000-p)<.008));
  });
  await test('모든 4시간 경계의 직전과 정각, 완료 시각별 색 지급',async()=>{
    const rows=await page.evaluate(async()=>{const {freshState,oreAt}=await import('/js/game-data.js'),{settle,validate}=await import('/js/game-store.js');return [0,4,8,12,16,20].map(h=>{const edge=new Date(2026,10,13,h).getTime(),s=freshState(),start=edge-300000;s.timer={running:true,checkpoint:start,startedAt:start,sessionMs:0};settle(s,edge-1);const before=s.oreClock.nextIndex;settle(s,edge);validate(s);return {before,at:s.oreClock.nextIndex,previous:oreAt(edge-1),ore:Object.values(s.days).flatMap(d=>d.oreRewards)[0].oreId};});});
    const next=['indigo','blue','green','yellow','orange','purple'],previous=['purple','indigo','blue','green','yellow','orange'];rows.forEach((r,i)=>assert.deepEqual(r,{before:0,at:1,previous:previous[i],ore:next[i]}));
  });
  await test('3분 종료 후 재방문·2분 재개와 세션 초기화',async()=>{
    const result=await page.evaluate(async()=>{const {freshState}=await import('/js/game-data.js'),{settle,operations,validate}=await import('/js/game-store.js');let s=freshState();const start=new Date('2026-11-13T03:58:00+09:00').getTime();s.timer={running:true,checkpoint:start,startedAt:start,sessionMs:0};settle(s,start+180000);operations.timer(s,'stop');const remainder=s.oreClock.remainderMs;s=JSON.parse(JSON.stringify(s));s.timer={running:true,checkpoint:start+3600000,startedAt:start+3600000,sessionMs:0};settle(s,start+3720000);validate(s);return {remainder,count:s.oreClock.nextIndex,left:s.oreClock.remainderMs,session:s.timer.sessionMs,ore:Object.values(s.days).flatMap(d=>d.oreRewards)[0].oreId};});
    assert.deepEqual(result,{remainder:180000,count:1,left:0,session:120000,ore:'blue'});
  });
  await test('하루 이상 자리 비움의 시간대별 지급과 지급 순서·잔액 검증',async()=>{
    const result=await page.evaluate(async()=>{const {freshState,oreAt,oreIndex}=await import('/js/game-data.js'),{settle,validate}=await import('/js/game-store.js');const s=freshState(),start=new Date('2026-11-12T03:58:00+09:00').getTime();s.timer={running:true,checkpoint:start,startedAt:start,sessionMs:0};settle(s,start+26*3600000+1250);validate(s);const receipts=Object.values(s.days).flatMap(d=>d.oreRewards),sum=Array(7).fill(0);receipts.forEach(r=>sum[oreIndex[r.oreId]]+=r.amount);const correct=receipts.every((r,i)=>r.index===i&&r.at===start+(i+1)*300000&&r.oreId===oreAt(r.at));const before=JSON.stringify(s);settle(s,start+26*3600000+1250);return {count:receipts.length,left:s.oreClock.remainderMs,correct,balanced:JSON.stringify(sum)===JSON.stringify(s.fragments),same:before===JSON.stringify(s),colors:new Set(receipts.map(r=>r.oreId)).size};});
    assert.deepEqual(result,{count:312,left:1250,correct:true,balanced:true,same:true,colors:6});
  });
  await test('시간을 뒤로 바꿔도 같은 구간을 다시 계산하지 않음',async()=>{
    const result=await page.evaluate(async()=>{const {freshState}=await import('/js/game-data.js'),{settle}=await import('/js/game-store.js');const s=freshState(),at=Date.now();s.timer={running:true,checkpoint:at,startedAt:at,sessionMs:0};settle(s,at+180000);settle(s,at+100000);settle(s,at+300000);return {ms:s.timer.sessionMs,rewards:s.oreClock.nextIndex};});assert.deepEqual(result,{ms:300000,rewards:1});
  });
  await test('회색 보상 최대 40개와 노트 1회 5개, 재완료·교환의 독립성',async()=>{
    const result=await page.evaluate(async()=>{const {freshState}=await import('/js/game-data.js'),{ensureDay,operations,validate}=await import('/js/game-store.js');const s=freshState(),d=ensureDay(s);for(const t of d.todos){operations.toggleTodo(s,t.id);operations.toggleTodo(s,t.id);operations.toggleTodo(s,t.id);}for(const r of s.routines)operations.toggleRoutine(s,r.id);operations.book(s,true);operations.book(s,true);validate(s);const earned=d.grayEarned;operations.exchange(s,{oreId:'indigo',amount:45,expectedBalance:45});return {earned,gray:s.fragments[6],indigo:s.fragments[3],stillEarned:d.grayEarned};});assert.deepEqual(result,{earned:45,gray:0,indigo:45,stillEarned:45});
  });
  await test('잘못된 교환 수량·회색 대상·잔액 부족·다른 창 변경 거부',async()=>{
    const result=await page.evaluate(async()=>{const {freshState}=await import('/js/game-data.js'),{operations}=await import('/js/game-store.js');const s=freshState();s.fragments[6]=10;return [{oreId:'blue',amount:0},{oreId:'blue',amount:-1},{oreId:'blue',amount:1.5},{oreId:'blue',amount:11},{oreId:'gray',amount:1},{oreId:'__proto__',amount:1},{oreId:'blue',amount:1,expectedBalance:9}].map(request=>{const before=JSON.stringify(s);try{operations.exchange(s,{expectedBalance:10,...request});return false;}catch{return JSON.stringify(s)===before;}});});assert(result.every(Boolean));
  });
  await test('교환소 확인·취소·최대 수량과 새로고침 유지',async()=>{
    await page.click('[data-action=take-book]');await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).fragments[6]===5,key);
    await page.goto('http://localhost:5173/#collection');await page.selectOption('#exchange-color','blue');await page.click('[data-action=exchange-max]');assert.equal(await page.inputValue('#exchange-amount'),'5');
    await page.click('#exchange-form button[type=submit]');await page.waitForSelector('[data-action=confirm-exchange]');assert.match(await page.locator('dialog').innerText(),/回色|회색 광석 5개/);await page.click('[data-action=close-modal]');assert.equal((await state()).fragments[6],5);
    await page.click('#exchange-form button[type=submit]');await page.click('[data-action=confirm-exchange]');await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).fragments[6]===0,key);await page.reload();await page.waitForSelector('#exchange-form');assert.equal((await state()).fragments[1],5);assert(await page.locator('#exchange-form button[type=submit]').isDisabled());
  });
  await test('동시 집중 정산과 동시 교환의 중복 방지',async()=>{
    const other=await context.newPage();await other.goto('http://localhost:5173');await other.waitForSelector('.dashboard');
    await page.evaluate(async()=>{const st=await import('/js/game-store.js');await st.transact(s=>{s.timer={running:true,checkpoint:Date.now()-600001,startedAt:Date.now()-600001,sessionMs:0};s.oreClock.remainderMs=0;s.fragments[6]=10;});});
    await Promise.all([page,other].map(p=>p.evaluate(async()=>{const st=await import('/js/game-store.js');await st.transact(()=>{});})));assert.equal((await state()).oreClock.nextIndex,2);
    const results=await Promise.all([page,other].map(p=>p.evaluate(async()=>{const st=await import('/js/game-store.js');try{await st.transact(s=>st.operations.exchange(s,{oreId:'green',amount:10,expectedBalance:10}));return true;}catch{return false;}})));assert.equal(results.filter(Boolean).length,1);assert.equal((await state()).fragments[6],0);await other.close();
    await page.evaluate(async()=>{const st=await import('/js/game-store.js');await st.transact(s=>st.operations.timer(s,'stop'));});
  });
  await test('집중 지급 저장 실패는 추첨·이력·잔액을 모두 보존하고 같은 결과로 재시도',async()=>{
    const result=await page.evaluate(async()=>{const st=await import('/js/game-store.js');await st.transact(s=>{s.timer={running:true,checkpoint:Date.now()-300001,startedAt:Date.now()-300001,sessionMs:0};s.oreClock.remainderMs=0;});const before=localStorage.getItem(st.STATE_KEY),old=Storage.prototype.setItem;let message;Storage.prototype.setItem=()=>{throw new DOMException('full','QuotaExceededError');};try{await st.transact(()=>{});}catch(e){message=e.message;}finally{Storage.prototype.setItem=old;}const unchanged=before===localStorage.getItem(st.STATE_KEY);const projected=JSON.parse(before);st.settle(projected);await st.transact(s=>st.operations.timer(s,'stop'));const after=st.current();return {unchanged,message,expected:projected.fragments,actual:after.fragments,count:after.oreClock.nextIndex-JSON.parse(before).oreClock.nextIndex};});assert(result.unchanged);assert.match(result.message,/저장하지 못/);assert.deepEqual(result.actual,result.expected);assert.equal(result.count,1);
  });
  await test('교환 저장 실패는 차감과 지급을 모두 취소',async()=>{
    const result=await page.evaluate(async()=>{const st=await import('/js/game-store.js');await st.transact(s=>s.fragments[6]=20);const before=localStorage.getItem(st.STATE_KEY),old=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw new DOMException('full','QuotaExceededError');};try{await st.transact(s=>st.operations.exchange(s,{oreId:'purple',amount:20,expectedBalance:20}));}catch{}finally{Storage.prototype.setItem=old;}return before===localStorage.getItem(st.STATE_KEY)&&JSON.stringify(st.current())===before;});assert(result);
  });
  await test('v2 백업 변환과 가구 구매력·기록·한도 보존, 소급 보상 없음',async()=>{
    const result=await page.evaluate(async()=>{const {freshState,dayKey}=await import('/js/game-data.js'),st=await import('/js/game-store.js');const old=freshState();old.version=2;delete old.oreClock;old.fragments=[2,3,4,5,6,7];const d=st.ensureDay(old);d.todoRewards=['vitality'];d.routineRewards=1;d.focusRewards=2;d.focusMs=3600000;d.journal='보존할 회고';for(const k of ['oreRewards','grayEarned','legacyRewardCount'])delete d[k];old.book={handled:true,picked:true};old.room.placed=[{slot:4,itemId:'lamp'}];old.timer={running:true,checkpoint:Date.now()-9999999,startedAt:Date.now()-9999999,sessionMs:12345};const s=st.parseBackup({format:'quiet-world-backup',state:old}),date=dayKey();st.operations.toggleTodo(s,s.days[date].todos[0].id);st.operations.book(s,true);st.operations.craft(s,'plant');return {version:s.version,fragments:s.fragments,placed:s.room.placed,journal:s.days[date].journal,ms:s.days[date].focusMs,legacy:s.days[date].legacyRewardCount,count:s.oreClock.nextIndex,running:s.timer.running,rem:s.oreClock.remainderMs};});
    assert.deepEqual(result,{version:3,fragments:[10,30,40,40,60,70,0],placed:[{slot:4,itemId:'lamp'}],journal:'보존할 회고',ms:3600000,legacy:4,count:0,running:false,rem:0});
  });
  await test('v2 실제 이전 전 백업 필수·원본 보관과 재진입 시 중복 변환 없음',async()=>{
    const c=await browser.newContext({timezoneId:'Asia/Seoul',acceptDownloads:true}),p=await c.newPage();await p.goto('http://localhost:5173');await p.waitForSelector('.dashboard');
    const original=await p.evaluate(async k=>{const {freshState}=await import('/js/game-data.js'),st=await import('/js/game-store.js');const s=freshState();s.version=2;delete s.oreClock;s.fragments=[1,2,3,4,5,6];const d=st.ensureDay(s);for(const f of ['oreRewards','grayEarned','legacyRewardCount'])delete d[f];s.timer={running:true,checkpoint:Date.now()-600000,startedAt:Date.now()-600000,sessionMs:0};const raw=JSON.stringify(s);localStorage.setItem(k,raw);return raw;},key);
    await p.reload();await p.waitForSelector('.recovery');assert(await p.locator('[data-action=migrate]').isDisabled());const download=p.waitForEvent('download');await p.click('[data-action=legacy-backup]');await download;await p.click('[data-action=migrate]');await p.waitForSelector('.dashboard');await p.reload();await p.waitForSelector('.dashboard');const r=await p.evaluate(k=>({s:JSON.parse(localStorage.getItem(k)),backup:JSON.parse(localStorage.getItem('quiet-world:before-ore-v3'))}),key);assert.deepEqual(r.s.fragments,[10,20,30,40,50,60,0]);assert.equal(r.s.oreClock.nextIndex,0);assert.equal(r.backup.entries[key],original);assert.equal(r.s.timer.running,false);assert(r.s.timer.sessionMs>=600000);await c.close();
  });
  await test('복원 시 저장된 나머지 시간 유지·타이머 정지, 중복 이력과 잘못된 형식 거부',async()=>{
    const result=await page.evaluate(async()=>{const {freshState}=await import('/js/game-data.js'),st=await import('/js/game-store.js');const s=freshState(),at=Date.now();s.timer={running:true,checkpoint:at-480000,startedAt:at-480000,sessionMs:0};st.settle(s,at);const backup=st.parseBackup({format:'quiet-world-backup',state:s});await st.restoreBackup(backup,localStorage.getItem(st.STATE_KEY));const restored=st.current(),bad=structuredClone(restored),d=Object.values(bad.days).find(d=>d.oreRewards.length);d.oreRewards.push(d.oreRewards[0]);d.focusRewards++;let rejected=false;try{st.validate(bad);}catch{rejected=true;}return {running:restored.timer.running,left:restored.oreClock.remainderMs,count:restored.oreClock.nextIndex,rejected};});assert.deepEqual(result,{running:false,left:180000,count:1,rejected:true});
  });
  await test('지급 이력 페이지 이동과 일곱 이미지 오프라인 캐시',async()=>{
    await page.evaluate(async()=>{const st=await import('/js/game-store.js');await st.transact(s=>{s.timer={running:true,checkpoint:Date.now()-125*60000,startedAt:Date.now()-125*60000,sessionMs:0};s.oreClock.remainderMs=0;});await st.transact(s=>st.operations.timer(s,'stop'));});
    await page.goto('http://localhost:5173/#records');await page.waitForSelector('.ore-history');assert.equal(await page.locator('.ore-history li').count(),20);await page.click('[data-action=receipt-next]');assert(await page.locator('.ore-history li').count()>0);await page.click('[data-action=receipt-prev]');assert.equal(await page.locator('.ore-history li').count(),20);
    await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await page.waitForSelector('.ore-history');
    const cached=await page.evaluate(async()=>{const c=await caches.open('quiet-world-shell-v5-ores');return Promise.all(Array.from({length:7},(_,i)=>c.match(`./assets/ores/pixil-layer-${i}.png`).then(Boolean)));});assert(cached.every(Boolean));
    await context.setOffline(true);await page.goto('http://localhost:5173/#collection');await page.waitForSelector('#exchange-form');assert(await page.locator('img').evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth>0)));await context.setOffline(false);
  });
  assert.deepEqual(errors,[]);console.log(`\n광석 전용 ${passed}개 검사 통과`);
}finally{await browser.close();}
