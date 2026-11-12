(()=>{
const prefix='quiet-world:';
const pad=n=>String(n).padStart(2,'0');

window.QuietWorld={
  today:()=>{
    const d=new Date();
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  },
  read:(key,fallback)=>{
    const value=localStorage.getItem(prefix+key);
    return value===null?fallback:JSON.parse(value);
  },
  write:(key,value)=>localStorage.setItem(prefix+key,JSON.stringify(value)),
  changed:()=>window.dispatchEvent(new Event('quiet-world:change'))
};
})();
