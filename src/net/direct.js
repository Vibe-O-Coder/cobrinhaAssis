/** Melhora uma sala autenticada para WebRTC quando a rede permite. A sinalização
 * e a presença continuam no relay. Falhas devolvem imediatamente a rota ao relay. */
export function DirectRoute(isHost, signal, receive, routeChanged) {
 const encoder=new TextEncoder(),decoder=new TextDecoder();
 let pc=null,control=null,state=null,epoch='',pending=[],healthy=false,lastAck=0,timer=null,closed=false;
 const available=()=>control?.readyState==='open'&&state?.readyState==='open';
 function setHealthy(value){if(healthy===value)return;healthy=value;routeChanged(value);}
 function reset(){clearInterval(timer);timer=null;setHealthy(false);control?.close();state?.close();control=state=null;pc?.close();pc=null;pending=[];}
 function attach(channel) {
  const owner=pc;
  channel.binaryType='arraybuffer';
  if(channel.label==='state')state=channel;else control=channel;
  channel.onclose=()=>{if(pc===owner)setHealthy(false);};channel.onerror=channel.onclose;
  channel.onmessage=event=>{
   if(pc!==owner)return;
   try{const data=JSON.parse(typeof event.data==='string'?event.data:decoder.decode(event.data));
    if(data.dc==='probe'){if(channel.readyState==='open')channel.send(JSON.stringify({dc:'ack',ts:data.ts}));return;}
    if(data.dc==='ack'){lastAck=performance.now();if(available())setHealthy(true);return;}
    receive(data);
   }catch{/* Invalid packets cannot break the game loop. */}
  };
  channel.onopen=()=>{
   if(pc!==owner||!available()||timer)return;
   const probe=()=>{if(!available()){setHealthy(false);return;}if(performance.now()-lastAck>2500)setHealthy(false);try{control.send(JSON.stringify({dc:'probe',ts:performance.now()}));}catch{setHealthy(false);}};
   timer=setInterval(probe,750);probe();
  };
 }
 function create(id) {
  reset();epoch=id;
  pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});
  const current=pc,outgoing=[];let described=false;
  // SDP must precede ICE on the ordered relay, even if gathering starts early.
  current.publishDescription=()=>{signal({t:'rtc',id,description:current.localDescription.toJSON()});described=true;for(const candidate of outgoing.splice(0))signal({t:'rtc',id,candidate});};
  current.onicecandidate=e=>{if(e.candidate&&current===pc){const candidate=e.candidate.toJSON();if(described)signal({t:'rtc',id,candidate});else outgoing.push(candidate);}};
  current.onconnectionstatechange=()=>{if(current===pc&&['failed','disconnected','closed'].includes(current.connectionState))setHealthy(false);};
  current.ondatachannel=e=>{if(current===pc)attach(e.channel);};return current;
 }
 async function begin(){
  if(closed||!isHost||pc||typeof RTCPeerConnection==='undefined')return;
  let current;
  try{current=create(crypto.randomUUID());attach(current.createDataChannel('control'));attach(current.createDataChannel('state',{ordered:false,maxRetransmits:0}));
   await current.setLocalDescription(await current.createOffer());if(pc===current)current.publishDescription();
  }catch{if(pc===current)reset();}
 }
 async function accept(data) {
  if(closed||typeof RTCPeerConnection==='undefined')return;
  try{
   if(data.description?.type==='offer'&&!isHost){
    const current=create(data.id);await current.setRemoteDescription(data.description);if(pc!==current)return;
    await current.setLocalDescription(await current.createAnswer());if(pc===current)current.publishDescription();
   }else if(data.id===epoch&&data.description?.type==='answer'&&isHost&&pc?.signalingState==='have-local-offer')await pc.setRemoteDescription(data.description);
   else if(data.id===epoch&&data.candidate){if(pc?.remoteDescription)await pc.addIceCandidate(data.candidate);else if(pending.length<128)pending.push(data.candidate);}
   if(pc?.remoteDescription)for(const candidate of pending.splice(0))await pc.addIceCandidate(candidate);
  }catch{setHealthy(false);}
 }
 return {begin,accept,reset,close(){closed=true;reset();},send(data){
  if(!healthy||!available())return false;
  const channel=data.t==='state'?state:control;
  const raw=JSON.stringify(data);
  // Leave large payloads to WebSocket, never fragment reliable game commands.
  if(channel.bufferedAmount>32768)return false;
  const bytes=encoder.encode(raw);if(bytes.byteLength>Math.min(60000,pc.sctp?.maxMessageSize||60000))return false;
  try{channel.send(bytes);return true;}catch{setHealthy(false);return false;}
 }};
}
