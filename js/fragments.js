(()=>{
const $=s=>document.querySelector(s);

const frags=[['생기','🧪',2],['집중','📕',1],['메아리','🖼',2],['흐름','⏱',1],['반짝임','✏️',0],['연결','🗝',1]];
const drawFrag=()=>$('#frag').innerHTML=frags.map(f=>`<div><div class="n">${f[0]}</div><span class="ic ico">${f[1]}</span><div class="c">${f[2]}</div></div>`).join('');
drawFrag();
$('#take').onclick=()=>{frags[2][2]++;drawFrag();window.addDayLog('낡은 노트를 주웠다. [ECHO +1]');$('#disc').classList.add('hide')};
$('#leave').onclick=()=>{window.addDayLog('그냥 두고 지나갔다.');$('#disc').classList.add('hide')};
})();
