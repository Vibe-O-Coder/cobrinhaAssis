// Temas instrumentais originais. Agendamento usa o relógio de áudio, independente de 20×.
import {S} from './state.js';
import {save} from './save.js';
import {audioContext,isMuted} from './audio.js';
import {actOf} from './scaling.js';
import {BOSS_ROSTER} from '../data/ecology.js';
import {recordedTrack} from '../data/soundtrack.js';
import {MusicPlayer} from './music-player.js';

export const ACT_THEMES = [
  {name:'Raízes do despertar',root:48,bpm:88,notes:[0,4,7,11,7,4,2,7]},
  {name:'Passos na ruína',root:45,bpm:96,notes:[0,3,7,10,8,7,3,2]},
  {name:'Cinzas em marcha',root:43,bpm:110,notes:[0,7,3,6,7,10,6,3]},
  {name:'Maré de vidro',root:50,bpm:94,notes:[0,2,7,9,11,9,7,2]},
  {name:'Vento cristalino',root:53,bpm:108,notes:[0,4,7,9,12,9,4,2]},
  {name:'Pulso da colmeia',root:46,bpm:122,notes:[0,1,7,3,8,7,1,3]},
  {name:'Relógio de gelo',root:47,bpm:102,notes:[0,3,6,10,12,6,3,1]},
  {name:'Jardim esquecido',root:42,bpm:90,notes:[0,1,5,8,7,5,1,0]},
  {name:'Ferro e estrelas',root:44,bpm:130,notes:[0,7,10,12,6,10,7,3]},
  {name:'À beira do vazio',root:40,bpm:116,notes:[0,1,6,7,12,10,6,1]},
];
export function musicTheme(wave,boss){
  const theme=ACT_THEMES[Math.max(0,Math.min(9,actOf(wave||1)))];
  if(!boss)return {...theme,key:'act-'+actOf(wave||1)};
  const seed=Math.max(0,BOSS_ROSTER.findIndex(b=>b.id===boss.type));
  return {name:boss.type==='boss_final'?'Coração do Devorador':'Duelo · '+theme.name,key:boss.type+'-'+(boss.bossPhase||0),
    root:theme.root-12+(seed%7),bpm:132+seed*2+(boss.bossPhase||0)*8,
    notes:theme.notes.map((_,i)=>(theme.notes[(i+seed)%8]+(i%3===seed%3?6:0))%13)};
}
let next=0,step=0,key='',bus=null,context=null;
const player=new MusicPlayer();
export const musicStatus=()=>player.status();
export function unlockMusic(){tickMusic();player.unlock();}
function note(ac,midi,t,duration,volume,type='triangle'){
  const o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.value=440*2**((midi-69)/12);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
  o.connect(g);g.connect(bus);o.start(t);o.stop(t+duration+.01);o.onended=()=>{o.disconnect();g.disconnect();};
}
export function tickMusic(dt=.016){
  const ac=audioContext();if(!ac)return;
  const view=S.role==='guest'?S.rs:S;
  const paused=document.hidden||(S.runActive&&(S.paused||view?.paused||S.phase!=='play'||view?.qte));
  const recorded=recordedTrack(view,S.runActive,S.runId);
  const streaming=player.tick(recorded,{dt,paused,volume:isMuted()?0:save.musicVolume*.65});
  if(ac.state!=='running')return;
  if(context!==ac){context=ac;bus=ac.createGain();bus.connect(ac.destination);next=ac.currentTime;}
  const active=S.runActive&&!paused&&!streaming;
  bus.gain.setTargetAtTime(active&&!isMuted()?save.musicVolume*.16:0,ac.currentTime,.08);
  if(!active||isMuted()||!save.musicVolume){next=ac.currentTime;return;}
  const boss=view?.enemies?.find(e=>String(e.type).startsWith('boss')&&e.hp>0),theme=musicTheme(view?.wave,boss);
  if(theme.key!==key){key=theme.key;step=0;next=ac.currentTime+.03;}
  if(next<ac.currentTime)next=ac.currentTime;
  const beat=60/theme.bpm/2;
  while(next<ac.currentTime+.12){
    const melody=theme.notes[step%theme.notes.length],chord=[0,5,3,7][Math.floor(step/16)%4];
    note(ac,theme.root+12+melody+chord,next,beat*.85,.22,boss?'square':'triangle');
    if(step%4===0)note(ac,theme.root+chord,next,beat*3.5,.45,'sine');
    if(step%2===0)note(ac,31+(step%4?7:0),next,.075,.25,'triangle');
    next+=beat;step++;
  }
}
