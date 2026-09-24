import {save} from '../core/save.js';
// Ícones vetoriais locais, sem fontes de ícones, imagens remotas ou filtros caros.
const paths={
  '▶️':'M6 3 22 12 6 21Z',
  '⏸️':'M6 3h4v18H6ZM15 3h4v18h-4Z',
  '🔊':'M2 9h5l6-5v16l-6-5H2Zm14-1c3 2 3 6 0 8m3-11c6 4 6 10 0 14',
  '🔇':'M2 9h5l6-5v16l-6-5H2Zm15 0 6 6m0-6-6 6',
  '🛒':'M1 3h3l3 12h13l3-9H5M9 19v2m10-2v2',
  '🌐':'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM2 12h20M12 2c-7 5-7 15 0 20 7-5 7-15 0-20Z',
  '📜':'M5 2h14v20H5Zm4 5h6M9 11h6m-6 5h6',
  '📊':'M3 22V12h4v10Zm7 0V6h4v16Zm7 0V2h4v20Z',
  '💪':'M3 17 7 7l2-4 4 1v5l-4-1-1 5c10-6 19 10 7 10H5Z',
  '🧲':'M4 2h5v12a3 3 0 0 0 6 0V2h5v12a8 8 0 0 1-16 0ZM4 7h5m6 0h5',
  '🤖':'M5 7h14v14H5Zm7-6v6M9 11v3m6-3v3m-6 4h6M1 11v6m22-6v6',
  '🕹️':'M3 15h18v7H3Zm9 0V8m0-7a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  '👟':'m3 3 6 1 2 8 9 4 2 5H2V11Z M2 17h19m-10-5 4-2m0 4 3-2',
  '⏱️':'M12 5a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM9 1h6m-3 0v4m0 4v5l4 2',
  '🍀':'M12 12C-6 9 4-5 12 5c9-10 18 4 0 7 18 4 8 17 0 7-9 10-18-4 0-7Zm0 7v5',
  '❤️':'M12 21C2 15 0 7 5 4c3-2 6 0 7 2 2-3 5-4 8-2 5 4 1 11-8 17Z',
  '🖤':'M12 21C2 15 0 7 5 4c3-2 6 0 7 2 2-3 5-4 8-2 5 4 1 11-8 17Z',
  '💔':'M12 21C2 15 0 7 5 4c3-2 6 0 7 2 2-3 5-4 8-2 5 4 1 11-8 17Z M13 5l-4 6 6 1-4 7',
  '💜':'M12 21C2 15 0 7 5 4c3-2 6 0 7 2 2-3 5-4 8-2 5 4 1 11-8 17Z',
  '🛡️':'M12 2 21 6v6c-1 5-5 8-9 10-4-2-8-5-9-10V6Z M8 12l3 3 5-6',
  '⚔️':'m4 3 15 15m-5 1 5-5M20 3 5 18m0-5 6 6M3 21l4-4m10 0 4 4',
  '🎯':'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 5 9-9',
  '🔮':'M12 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM6 22h12M8 18l-2 4m10-4 2 4M9 6l5 7',
  '🗡️':'m4 20 4-4m-3-4 7 7M8 15 18 3l3-1-1 4L10 17',
  '💀':'M5 16C-3 1 27-4 20 16l-4 1v5H8v-5ZM7 9v3m10-3v3m-6 7v3m3-3v3',
  '💣':'M11 7a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM14 7l3-5 3 2m0-4 1 2m0 3 3 1',
  '🪓':'M6 22 16 2m-4 2c-7-3-8 7-6 8l6-1m2-4c6 5 7 1 8-2L17 2',
  '🏹':'M5 2c19 1 19 19 0 20L16 12ZM2 12h19m-3-3 3 3-3 3',
  '❄️':'M12 1v22M2 6l20 12M2 18 22 6m-13-3 3 3 3-3m-6 18 3-3 3 3M2 9l4-1-1-4m14 16-1-4 4-1',
  '🐉':'M3 18 7 7l5-5 3 6 6 2-5 4-3 8-4-7Zm5-8 6 1M3 18l-1 4 6-2',
  '🐍':'M4 20c-7-8 15-3 13-10-2-6-12 6-13-1C3 0 19 0 19 7m-5-3h1m4 4 4-1',
  '🎲':'M4 2h16l2 2v16l-2 2H4l-2-2V4ZM7 6v2m10 8v2m-5-7v2m5-7v2M7 16v2',
  '🍖':'M7 15c-8-10 4-18 12-9s-3 15-10 12l-4 4-3-3Z',
  '🔧':'m2 22 12-12c-4-9 7-12 8-7l-5 3 2 4 4-3c2 7-4 9-9 7L5 23Z',
  '⛈️':'M3 14C-1 7 7 4 9 6c4-8 12-3 11 2 6 2 3 7-1 7M13 12l-5 6h5l-3 6m-6-7-1 4',
  '⏳':'M4 2h16M4 22h16M6 2v4l12 12v4M18 2v4L6 18v4M8 5h8M8 20h8',
  '🌳':'M12 2 3 12h4l-5 6h8v5h4v-5h8l-5-6h4Z',
  '🏆':'M7 2h10v10c-1 7-9 7-10 0ZM7 5H2v5l5 3m10-8h5v5l-5 3M12 16v5m-5 1h10',
  '🧪':'M7 2h10m-8 0v8L3 20l2 2h14l2-2-6-10V2M7 15h10',
  '👥':'M8 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM1 22v-5c0-7 14-7 14 0v5m2-19c7 0 7 9 0 9m1 2c5 1 5 4 5 8',
  '🔥':'M12 2c2 8-8 7-8 14 0 9 19 8 17-2l-4-6-2 7c-5 3-5-2-3-13Z',
};
const generic='m12 2 3 6 7 4-7 3-3 7-3-7-7-3 7-4Z';
const emoji=/\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*/gu;
export function vectorize(root=document.body){
  const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];let node;
  while((node=walk.nextNode()))if(!node.parentElement?.closest('script,style,svg,canvas,input,textarea,option,.ui-icon')&&node.textContent.match(emoji))nodes.push(node);
  for(const n of nodes){const frag=document.createDocumentFragment();let last=0;
    for(const match of n.textContent.matchAll(emoji)){
      frag.append(n.textContent.slice(last,match.index));const el=document.createElement('span');el.className='ui-icon';el.setAttribute('aria-hidden','true');
      el.innerHTML='<span class="emoji-icon">'+match[0]+'</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="'+(paths[match[0]]||generic)+'"/></svg>';
      if(['❤️','💔','🖤'].includes(match[0])){
        el.style.color=match[0]==='🖤'?'#796888':'#ff7395';
        if(match[0]==='❤️')el.querySelector('svg').setAttribute('fill','currentColor');
      }
      frag.append(el);last=match.index+match[0].length;
    }frag.append(n.textContent.slice(last));n.replaceWith(frag);
  }
}
export function installIcons(){
  const sync=()=>document.body.dataset.art=save.art;
  sync();vectorize();let pending=false;const roots=new Set();
  const observer=new MutationObserver(records=>{
    for(const r of records)if(r.target.nodeType===1&&!r.target.closest('.ui-icon,svg'))roots.add(r.target);
    if(pending)return;pending=true;requestAnimationFrame(()=>{observer.disconnect();sync();for(const r of roots)if(r.isConnected)vectorize(r);roots.clear();pending=false;observer.observe(document.body,{childList:true,subtree:true});});
  });observer.observe(document.body,{childList:true,subtree:true});
  document.querySelector('#artSelect').addEventListener('change',sync);
}
