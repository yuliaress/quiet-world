(()=>{
const date=new Date();
document.querySelector('#date').textContent=new Intl.DateTimeFormat('ko-KR',{
  year:'numeric',month:'numeric',day:'numeric',weekday:'long'
}).format(date);
})();
