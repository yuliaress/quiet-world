import {CYCLE_MS,PROBABILITIES,ORES,oreAt,oreIndex,dayKey} from './game-data.js';

// Counter-seeded draws are reproducible: retrying a failed save cannot reroll a reward.
// The seed is personal game state, not a secure purchase entitlement.
function mix(n){n=Math.imul(n^(n>>>16),0x21f0aaad);n=Math.imul(n^(n>>>15),0x735a2d97);return (n^(n>>>15))>>>0;}
export function drawAmount(seed,index) {
  const words=seed.match(/.{8}/g).map(x=>parseInt(x,16));let lane=0;
  function randomInt(bound){const limit=Math.floor(0x100000000/bound)*bound;let value;do{let x=mix(words[0]^(index>>>0));x=mix(x^words[1]^Math.floor(index/0x100000000));x=mix(x^words[2]^lane++);value=mix(x^words[3]);}while(value>=limit);return value%bound;}
  return amountFromTickets(randomInt(100),randomInt(5));
}
export function amountFromTickets(bandTicket,amountTicket) {
  if(!Number.isInteger(bandTicket)||bandTicket<0||bandTicket>=100||!Number.isInteger(amountTicket)||amountTicket<0||amountTicket>=5)throw new RangeError('추첨 범위를 확인해 주세요.');
  let total=0;for(const band of PROBABILITIES){total+=band.weight;if(bandTicket<total)return band.min+(band.min===band.max?0:amountTicket);}
}
export function applyElapsed(s,from,to,ensureDay,addLog) {
  let cursor=from;
  while(cursor<to){
    const midnight=new Date(cursor);midnight.setHours(24,0,0,0);
    const rewardAt=cursor+(CYCLE_MS-s.oreClock.remainderMs),next=Math.min(to,midnight.getTime(),rewardAt),delta=next-cursor;
    const d=ensureDay(s,dayKey(cursor));d.focusMs+=delta;s.timer.sessionMs+=delta;s.oreClock.remainderMs+=delta;
    if(s.oreClock.remainderMs===CYCLE_MS){
      const date=dayKey(next),day=ensureDay(s,date),index=s.oreClock.nextIndex++,oreId=oreAt(next),amount=drawAmount(s.oreClock.seed,index);
      s.fragments[oreIndex[oreId]]+=amount;
      const time=new Date(next).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
      day.oreRewards.push({index,at:next,oreId,amount,time});day.focusRewards++;s.oreClock.remainderMs=0;
      addLog(s,`집중 5분 보상 · ${ORES[oreIndex[oreId]].name} 광석 +${amount}`,date,next);
    }
    cursor=next;
  }
}
