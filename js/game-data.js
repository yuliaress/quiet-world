export const MATERIALS = [
  {id:'vitality', name:'생기', field:'몸 돌보기', color:'#709c78', task:'물 두 컵 마시기'},
  {id:'focus', name:'집중', field:'작은 시작', color:'#8a91c3', task:'미뤄 둔 일 20분 해 보기'},
  {id:'echo', name:'메아리', field:'마음 살피기', color:'#c18eac', task:'오늘 기분 한 줄 적기'},
  {id:'flow', name:'흐름', field:'일상 가꾸기', color:'#6d9fab', task:'주변을 조금 정리하기'},
  {id:'spark', name:'반짝임', field:'무언가 만들기', color:'#c7a655', task:'작은 것 하나 만들어 보기'},
  {id:'bond', name:'연결', field:'마음 나누기', color:'#c78671', task:'소중한 사람에게 안부 전하기'},
];
// Category IDs remain unchanged so existing tasks keep their meaning.
export const ORES = [
  {id:'green',name:'초록색',color:'#90b661',image:'assets/ores/pixil-layer-3.png',hours:'08:00–11:59'},
  {id:'blue',name:'파란색',color:'#61b5db',image:'assets/ores/pixil-layer-4.png',hours:'04:00–07:59'},
  {id:'purple',name:'보라색',color:'#b790c8',image:'assets/ores/pixil-layer-0.png',hours:'20:00–23:59'},
  {id:'indigo',name:'남색',color:'#8185bb',image:'assets/ores/pixil-layer-5.png',hours:'00:00–03:59'},
  {id:'yellow',name:'노란색',color:'#dfbe5c',image:'assets/ores/pixil-layer-2.png',hours:'12:00–15:59'},
  {id:'orange',name:'주황색',color:'#d68b62',image:'assets/ores/pixil-layer-1.png',hours:'16:00–19:59'},
  {id:'gray',name:'회색',color:'#92a5ad',image:'assets/ores/pixil-layer-6.png',hours:'할 일·루틴·교환용'},
];
export const oreIndex=Object.fromEntries(ORES.map((o,i)=>[o.id,i]));
export const TIME_ORES=['indigo','blue','green','yellow','orange','purple'];
export const CYCLE_MS=5*60*1000;
export const PROBABILITIES=[{min:15,max:19,weight:45},{min:10,max:14,weight:20},{min:20,max:24,weight:20},{min:5,max:9,weight:10},{min:25,max:25,weight:5}];
export const oreAt=(at=Date.now())=>TIME_ORES[Math.floor(new Date(at).getHours()/4)];
export function freshOreClock(){return {remainderMs:0,nextIndex:0,seed:Array.from(crypto.getRandomValues(new Uint32Array(4)),x=>x.toString(16).padStart(8,'0')).join('')};}
export const ITEMS = [
  {id:'plant', name:'작은 화분', kind:'초록을 곁에', color:'#769c75', cost:{green:10,indigo:10}},
  {id:'rug', name:'포근한 러그', kind:'발밑의 온기', color:'#b28ca4', cost:{yellow:10,orange:10}},
  {id:'lamp', name:'탁상 조명', kind:'은은한 불빛', color:'#d2b362', cost:{blue:10,yellow:10}},
  {id:'bookshelf', name:'책장', kind:'이야기가 머무는 곳', color:'#b58769', cost:{blue:20,purple:10}},
];
export const MOODS = [
  {name:'비 오는 마음', text:'잠깐 쉬어 가도 괜찮아요.', color:'#879eaf'},
  {name:'조금 흐림', text:'천천히, 내 속도로 해 봐요.', color:'#a8aabd'},
  {name:'햇살 한 조각', text:'작은 기쁨을 모아 두어요.', color:'#d7b75e'},
  {name:'고요한 밤', text:'오늘의 나에게 수고했다고 말해요.', color:'#8c87a9'},
];
export const itemById = Object.fromEntries(ITEMS.map(x=>[x.id,x]));
export const materialIndex = Object.fromEntries(MATERIALS.map((x,i)=>[x.id,i]));
export function dayKey(time=Date.now()) {
  const d=new Date(time), pad=n=>String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
export function validDate(s) {
  return typeof s==='string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && dayKey(new Date(`${s}T12:00:00`).getTime())===s;
}
export const uid=()=>crypto.randomUUID();
export function clock(ms) {
  const n=Math.max(0,Math.floor(ms/1000));
  return [Math.floor(n/3600),Math.floor(n/60)%60,n%60].map(v=>String(v).padStart(2,'0')).join(':');
}
export const formatDate=(date,options={month:'long',day:'numeric',weekday:'long'})=>new Intl.DateTimeFormat('ko-KR',options).format(new Date(`${date}T12:00:00`));
export function freshDay(defaults=true) {
  return {todos:defaults?MATERIALS.map(m=>({id:uid(),text:m.task,category:m.id,done:false})):[],
    routineDone:{},routineRewarded:{},todoRewards:[],routineRewards:0,focusRewards:0,
    focusMs:0,mood:null,journal:'',logs:[],badges:[],oreRewards:[],grayEarned:0,legacyRewardCount:0};
}
export function freshState() {
  return {version:3,rev:0,createdOn:dayKey(),onboarded:false,days:{},oreClock:freshOreClock(),
    routines:[{id:uid(),name:'아침을 여는 시간',description:'물 마시기 / 스트레칭 / 창문 열기'},
      {id:uid(),name:'하루를 닫는 시간',description:'정리 / 기록 / 내일 준비'}],
    fragments:[0,0,0,0,0,0,0],book:{handled:false,picked:false},
    room:{inventory:Object.fromEntries(ITEMS.map(i=>[i.id,0])),placed:[]},
    timer:{running:false,checkpoint:null,sessionMs:0,startedAt:null}};
}
