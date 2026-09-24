// Durações medidas nos MP3 entregues. Reavaliar ao substituir um arquivo.
const track=(id,title,duration,loop=true)=>({id,title,duration,loop,
  src:new URL('../../tracks/'+id+'.mp3',import.meta.url).href});
export const MENU_TRACK=track('menu','Antes da Primeira Curva',128.832);
export const ACT_TRACKS=[
  track('monocromo','Primeiro Pixel',179.52),
  track('pixel','Cor em Movimento',179.584),
  track('navegador','Janela Aberta',234.048),
  track('arcade','Ficha Infinita',194.645333),
];
export const FINAL_TRACKS=[
  track('a-fome-entre-os-mundos','A Fome entre os Mundos',214.912,false),
  track('ainda-ha-um-sinal','Ainda Há um Sinal',258.538667,false),
  track('o-ultimo-pixel','O Último Pixel',249.856,false),
];

export function recordedTrack(view,runActive,runId=0) {
  if(!runActive)return {...MENU_TRACK,key:'menu'};
  const boss=view?.enemies?.find(e=>e.type==='boss_final'&&e.hp>0)
    ||view?.enemies?.find(e=>String(e.type).startsWith('boss')&&e.hp>0);
  if(boss){
    if(boss.type!=='boss_final')return null;
    const phase=Math.min(2,boss.bossPhase||0),t=FINAL_TRACKS[phase];
    return {...t,key:runId+':'+boss.id+':'+t.id,at:boss.survival?.elapsed};
  }
  const act=Math.max(0,Math.min(9,Math.floor(((view?.wave||1)-1)/29)));
  const t=ACT_TRACKS[act];
  return t?{...t,key:runId+':'+t.id}:null;
}
