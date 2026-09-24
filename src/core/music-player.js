// Streaming: no máximo dois elementos durante uma transição; nenhum MP3 é
// decodificado inteiro nem todas as faixas são baixadas na abertura do jogo.
export class MusicPlayer {
  constructor(makeAudio=()=>new Audio()) {
    this.makeAudio=makeAudio;this.current=null;this.outgoing=null;
    this.failed=new Set();this.clock=0;this.suspended=false;
  }
  dispose(voice) {
    if(!voice)return;
    voice.audio.pause();voice.audio.removeAttribute('src');voice.audio.load();
  }
  create(track) {
    const audio=this.makeAudio();
    const voice={audio,track,fade:0,pending:false,retryAt:0,failed:false};
    audio.preload='auto';audio.loop=false;audio.volume=0;
    audio.src=track.src;
    audio.onerror=()=>{voice.failed=true;this.failed.add(track.src);};
    return voice;
  }
  change(track) {
    this.dispose(this.outgoing);
    this.outgoing=this.current;
    this.current=track?this.create(track):null;
  }
  play(voice) {
    if(!voice||voice.pending||voice.failed||voice.audio.ended||!voice.audio.paused||this.clock<voice.retryAt)return;
    voice.pending=true;
    Promise.resolve(voice.audio.play()).catch(error=>{
      if(error.name==='NotSupportedError'){voice.failed=true;this.failed.add(voice.track.src);}
      // Uma pausa durante play() causa AbortError. Autoplay bloqueado pode
      // ser tentado de novo numa interação, sem desativar a música da sessão.
      voice.retryAt=error.name==='AbortError'?0:this.clock+2;
    }).finally(()=>{voice.pending=false;});
  }
  unlock() {
    if(this.suspended)return;
    for(const voice of [this.current,this.outgoing])if(voice){voice.retryAt=0;this.play(voice);}
  }
  tick(track,{dt=.016,paused=false,volume=.3}={}) {
    this.clock+=dt;this.suspended=paused;
    if((track?.key??null)!==(this.current?.track.key??null))this.change(track);
    const current=this.current;
    if(current){
      current.track=track;
      const a=current.audio;
      // A simulação é a autoridade: pausa, queda de FPS, mute e co-op não
      // podem adiantar a fase. Corrige também a entrada tardia do convidado.
      if(Number.isFinite(track.at)&&a.readyState>=1&&Number.isFinite(a.duration)){
        const at=Math.min(track.at,Math.max(0,a.duration-.04));
        if(Math.abs(a.currentTime-at)>.65){try{a.currentTime=at;}catch{}}
      }
      if(!paused&&track.loop&&!current.failed&&Number.isFinite(a.duration)&&
          a.currentTime>=Math.max(1,a.duration-2))this.change(track);
    }
    for(const voice of [this.current,this.outgoing]) {
      if(!voice)continue;
      if(paused){voice.audio.pause();continue;}
      const incoming=voice===this.current;
      voice.fade=Math.max(0,Math.min(1,voice.fade+(incoming?dt:-dt)/2));
      voice.audio.volume=Math.max(0,Math.min(1,volume*voice.fade));
      this.play(voice);
    }
    if(this.outgoing&&this.outgoing.fade<=0){this.dispose(this.outgoing);this.outgoing=null;}
    return this.playing;
  }
  get playing() {
    return [this.current,this.outgoing].some(v=>v&&!v.failed&&!v.audio.paused&&!v.audio.ended&&v.audio.readyState>=3);
  }
  status() {
    const v=this.current;
    return v?{id:v.track.id,time:v.audio.currentTime,duration:v.audio.duration,
      paused:v.audio.paused,ended:v.audio.ended,failed:v.failed,volume:v.audio.volume}:null;
  }
}
