import {mkdir,cp} from 'node:fs/promises';
// Explicit allowlist: never ship development notes, test results or backups.
const files=['index.html','manifest.webmanifest','service-worker.js','css/app.css','js/app.js','js/game-data.js','js/game-store.js','js/ore-ui.js','js/ore-rewards.js','js/legacy-migration.js','assets/app-icon.svg',...Array.from({length:7},(_,i)=>`assets/ores/pixil-layer-${i}.png`)];
await mkdir('dist',{recursive:true});
for(const path of files){await mkdir(`dist/${path.split('/').slice(0,-1).join('/')}`,{recursive:true});await cp(path,`dist/${path}`);}
console.log('QUIET WORLD 정적 앱 준비 완료');
