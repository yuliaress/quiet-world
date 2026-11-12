(()=>{
const status=document.querySelector('#pwa-status'), installButton=document.querySelector('#install-app');
let installPrompt=null;

window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();
  installPrompt=event;
  installButton.hidden=false;
});

installButton.onclick=async()=>{
  if(!installPrompt) return;
  try{
    await installPrompt.prompt();
    const choice=await installPrompt.userChoice;
    if(choice.outcome==='accepted') status.textContent='앱을 설치했어요.';
    installPrompt=null;
    installButton.hidden=true;
  }catch(error){
    console.error('PWA installation failed.',error);
    status.textContent='앱 설치를 시작하지 못했어요.';
  }
};

window.addEventListener('appinstalled',()=>{
  installPrompt=null;
  installButton.hidden=true;
  status.textContent='앱을 설치했어요.';
});

window.addEventListener('load',()=>{
  if(!('serviceWorker' in navigator)){
    status.textContent='이 브라우저는 오프라인 저장을 지원하지 않아요.';
    return;
  }
  navigator.serviceWorker.register('./service-worker.js').then(()=>{
    status.textContent='오프라인 플레이 준비 완료';
  }).catch(error=>{
    console.error('Service worker registration failed.',error);
    status.textContent='오프라인 저장을 설정하지 못했어요.';
  });
});
})();
