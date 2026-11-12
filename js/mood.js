(()=>{
const Q=window.QuietWorld, key=`mood:${Q.today()}`;
const moods=[
  {icon:'🌧',title:'비 온다.',description:'창밖만 멍하니 보는 중.'},
  {icon:'☁️',title:'흐리다.',description:'천천히 해도 괜찮아.'},
  {icon:'☀️',title:'햇살이 난다.',description:'조금은 가벼운 하루.'},
  {icon:'🌙',title:'고요한 밤.',description:'오늘을 잘 마무리하는 중.'}
];
let index=Q.read(key,0);
if(!Number.isInteger(index)||index<0||index>=moods.length) throw new TypeError('Saved mood is invalid.');
const button=document.querySelector('#mood');

function render(){
  const mood=moods[index];
  button.querySelector('.ico').textContent=mood.icon;
  button.querySelector('b').textContent=mood.title;
  button.querySelector('small').textContent=mood.description;
}

button.onclick=()=>{
  index=(index+1)%moods.length;
  Q.write(key,index);
  render();
  window.addDayLog(`기분을 바꿨어요: ${moods[index].title}`);
};
render();
})();
