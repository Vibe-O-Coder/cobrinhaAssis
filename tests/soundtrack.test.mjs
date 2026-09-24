import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {MusicPlayer} from '../src/core/music-player.js';
import {MENU_TRACK,ACT_TRACKS,FINAL_TRACKS,recordedTrack} from '../src/data/soundtrack.js';
import {beginSurvival,advanceSurvival,survivalSection,survivalTime} from '../src/game/finale.js';
import {packMessage,unpackMessage} from '../src/net/codec.js';

class FakeAudio {
  paused=true;ended=false;readyState=4;currentTime=0;duration=100;volume=0;plays=0;disposed=false;
  play(){this.paused=false;this.plays++;return Promise.resolve();}
  pause(){this.paused=true;}
  removeAttribute(){this.disposed=true;}
  load(){}
}
const cue=(key,loop=true)=>({key,id:key,src:key+'.mp3',loop});

test('Os oito arquivos existem; atos sem faixa e chefes comuns preservam o sintetizador',()=>{
  const tracks=[MENU_TRACK,...ACT_TRACKS,...FINAL_TRACKS];
  assert.equal(tracks.length,8);
  for(const track of tracks)assert.ok(fs.existsSync(new URL(track.src)),track.src);
  assert.equal(recordedTrack({},false).id,'menu');
  for(const [i,id] of ['monocromo','pixel','navegador','arcade'].entries())
    assert.equal(recordedTrack({wave:i*29+1},true).id,id);
  assert.equal(recordedTrack({wave:117},true),null);
  assert.equal(recordedTrack({wave:10,enemies:[{type:'boss',hp:1}]},true),null);
  assert.notEqual(recordedTrack({wave:1},true,1).key,recordedTrack({wave:1},true,2).key);
});
test('Pausa preserva posição, mute preserva reprodução e retomar não reinicia',()=>{
  const player=new MusicPlayer(()=>new FakeAudio());
  player.tick(cue('menu'),{dt:1});const audio=player.current.audio;
  audio.currentTime=24;player.tick(cue('menu'),{paused:true});
  assert.ok(audio.paused);assert.equal(audio.currentTime,24);
  player.current.pending=false;player.tick(cue('menu'),{volume:0});
  assert.equal(audio.paused,false);assert.equal(audio.volume,0);assert.equal(audio.currentTime,24);
});
test('Loop de ato faz transição entre dois elementos e descarta o anterior',()=>{
  const created=[],player=new MusicPlayer(()=>{const a=new FakeAudio();created.push(a);return a;});
  player.tick(cue('act'),{dt:2});created[0].currentTime=98;
  player.tick(cue('act'),{dt:.1});assert.equal(created.length,2);
  assert.equal(player.current.audio.currentTime,0);assert.equal(player.outgoing.audio,created[0]);
  player.tick(cue('act'),{dt:2});assert.ok(created[0].disposed);assert.equal(player.outgoing,null);
});
test('Trocar rapidamente de tema não aumenta de repente o volume anterior',()=>{
  const player=new MusicPlayer(()=>new FakeAudio());
  player.tick(cue('menu'),{dt:.05,volume:1});const previous=player.current.audio;
  const volume=previous.volume;player.tick(cue('act'),{dt:.01,volume:1});
  assert.ok(previous.volume<=volume);
});
test('Faixa final termina uma vez; falha de mídia permite fallback',()=>{
  const player=new MusicPlayer(()=>new FakeAudio());
  player.tick(cue('final',false));const audio=player.current.audio;
  audio.ended=true;audio.currentTime=100;player.tick(cue('final',false));
  assert.equal(player.current.audio,audio);assert.equal(player.playing,false);
  player.tick(cue('missing'));player.current.audio.onerror();
  player.tick(cue('missing'),{dt:3});assert.equal(player.playing,false);
});
test('Survival corrige deriva do áudio e sincroniza entrada tardia, mesmo em mute',()=>{
  const player=new MusicPlayer(()=>new FakeAudio());
  player.tick({...cue('vocal',false),at:53},{volume:0});
  assert.equal(player.current.audio.currentTime,53);
  player.tick({...cue('vocal',false),at:53.2},{paused:true});
  assert.equal(player.current.audio.currentTime,53);
  player.tick({...cue('vocal',false),at:70},{volume:0});
  assert.equal(player.current.audio.currentTime,70);
});
test('Survival respeita duração medida e só abre o limiar da fase III no final',()=>{
  const boss={mhp:300,hp:198};beginSurvival(boss);
  assert.equal(boss.survival.duration,258.538667);assert.equal(survivalTime(boss.survival),'4:19');
  assert.equal(advanceSurvival(boss,100),false);assert.equal(survivalSection(boss.survival),1);
  assert.equal(advanceSurvival(boss,-100),false);assert.equal(boss.survival.elapsed,100);
  advanceSurvival(boss,150);assert.equal(survivalSection(boss.survival),4);
  assert.equal(advanceSurvival(boss,8.6),true);assert.equal(boss.survival,null);
  assert.equal(boss.hp,99);assert.equal(boss.ward,0);
});
test('Protocolo co-op preserva relógio e duração do survival',()=>{
  const boss={id:7,type:'boss_final',hp:200,bossPhase:1};beginSurvival(boss);advanceSurvival(boss,112.5);
  const result=unpackMessage(packMessage({t:'state',s:{enemies:[boss]}})).s.enemies[0];
  assert.deepEqual(result.survival,boss.survival);
});
