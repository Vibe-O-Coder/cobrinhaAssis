import {EDEF} from '../data/enemies.js';
import {W,H,TAU} from '../core/config.js';
import {clamp} from '../core/utils.js';
import {addText} from '../render/fx.js';

// Quinze encontros novos. Cada rotina compõe três geometrias e tempos distintos.
const names={bastion:['PORTÕES DE CERCO','CARGA DA FORTALEZA','BATERIA PESADA'],garden:['RAÍZES BIFURCADAS','FLORAÇÃO ESPINHOSA','SEMEADURA'],carillon:['TRÊS BADALADAS','PAUTA DO SILÊNCIO','ACORDE FÚNEBRE'],migration:['FORMAÇÃO EM V','VENTOS CRUZADOS','REVOADA'],anvil:['MARTELOS DA FORJA','FERRO EM BRASA','BIGORNA CENTRAL'],coil:['ANÉIS DA SERPENTE','PRESA DUPLA','CAUDA ESPIRAL'],tide:['MARÉ VAZANTE','RESSACA','ONDAS GÊMEAS'],glacier:['ESTALACTITES','ROSA DO INVERNO','GELO ESTILHAÇADO'],clock:['PONTEIROS','DOZE HORAS','SEGUNDO PERDIDO'],mirror:['SALA DE ESPELHOS','FALSAS IMAGENS','REFLEXÃO TRIPLA'],furnace:['CORREDOR DA FORNALHA','NÚCLEO SOLAR','RODA DE FOGO'],graveyard:['LÁPIDES','EXUMAÇÃO','FOICES DO OSSUÁRIO'],null:['VOTO DE SILÊNCIO','ARMAS AO CHÃO','APAGAMENTO'],starfall:['CONSTELAÇÃO PARTIDA','CHUVA DE COMETAS','ESTRELAS BINÁRIAS'],eclipse:['PENUMBRA','TOTALIDADE','LUZ RASGADA']};
export const BOSS_ROUTINES=names;
export function castCatalogBoss(e,head,newMinion,{hazard,shot,fan,summon}) {
 const def=EDEF[e.type],routine=def?.routine;if(!routine)return false;
 const target=head||{x:e.x,y:e.y+240},phase=Math.min(3,(e.bossPhase||0)+(e.rank||0));
 const move=(e.bossMove||0)%3;e.bossMove=(e.bossMove||0)+1;
 e.bossAction=names[routine][move];e.bossClock=Math.max(2.9,5-phase*.45)+(e.bossSlot||0)*.17;
 addText(e.x,e.y-e.r-30,e.bossAction,def.c,1.6,16);
 const a=Math.atan2(target.y-e.y,target.x-e.x),n=3+phase;
 const point=(x,y)=>({x:clamp(x,35,W-35),y:clamp(y,35,H-35)});
 const circle=(x,y,r,delay=1.2,life=.5,effect='',extra={})=>hazard(e,{shape:'circle',...point(x,y),r,delay,life,effect,c:def.c,...extra});
 const line=(x,y,x2,y2,delay=1.2,width=24,effect='')=>hazard(e,{shape:'line',...point(x,y),x2:clamp(x2,20,W-20),y2:clamp(y2,20,H-20),delay,width,life:.55,effect,c:def.c});
 const ray=(ang,len=540,delay=1.2,effect='')=>line(e.x,e.y,e.x+Math.cos(ang)*len,e.y+Math.sin(ang)*len,delay,24,effect);
 const ring=(x,y,r,inner,delay=1.2,effect='')=>circle(x,y,r,delay,.7,effect,{shape:'ring',inner});
 const volley=(ang,count=7,spread=.2,speed=210,effect='')=>fan(e,e,ang,count,spread,speed,{effect});
 switch(routine){
 case 'bastion':
  if(move===0)for(let i=0;i<n;i++){const x=target.x-250+i*130;line(x,target.y-300,x,target.y-50,1+i*.12);line(x,target.y+60,x,target.y+300,1+i*.12);}
  else if(move===1){const end=point(target.x,target.y);line(e.x,e.y,end.x,end.y,1.2,65);e.charge={x:e.x,y:e.y,x2:end.x,y2:end.y,delay:1.2,t:0,duration:.6};}
  else for(let i=0;i<n+1;i++)circle(target.x+(i%2?140:-140),target.y-200+i*90,70,1+i*.2);break;
 case 'garden':
  if(move===0)for(let i=-1;i<=1;i++){line(e.x,e.y,target.x+i*150,target.y+150,1.3);if(phase)circle(target.x+i*150,target.y+150,65,2);}
  else if(move===1){ring(target.x,target.y,300,210,1.2,'poison');ring(target.x,target.y,170,95,2,'poison');}
  else {summon(e,4+phase*2,newMinion,{effect:'poison'});for(let i=0;i<n;i++)circle(target.x+Math.cos(i*2)*170,target.y+Math.sin(i*2)*170,75,1.4,2,'poison');}break;
 case 'carillon':
  if(move===0)for(let i=0;i<3;i++)ring(e.x,e.y,150+i*130,90+i*130,1+i*.65,'silence');
  else if(move===1)for(let i=0;i<n;i++)line(target.x-330,target.y-180+i*100,target.x+330,target.y-180+i*100,1.2+i*.2,18,'silence');
  else for(let i=0;i<n+1;i++)circle(target.x+Math.cos(i*TAU/(n+1))*180,target.y+Math.sin(i*TAU/(n+1))*180,75,1+i*.2,.5,'stun');break;
 case 'migration':
  if(move===0){for(let side of [-1,1])for(let i=0;i<n;i++){const at={x:e.x+side*i*55,y:e.y-i*35};fan(e,at,a,2,.2,190,{effect:'slow'});}summon(e,3+phase,newMinion,{rageT:2});}
  else if(move===1){line(target.x-330,target.y-250,target.x+330,target.y+250,1.3);line(target.x+330,target.y-250,target.x-330,target.y+250,2.1);}
  else for(let i=0;i<n+2;i++)line(target.x-320+i*120,target.y-350,target.x-320+i*120,target.y+350,1+i*.3,22,'slow');break;
 case 'anvil':
  if(move===0)for(let i=0;i<n;i++){const x=target.x-180+i*120;circle(x,target.y,70,1+i*.4,.5,'stun');line(x-80,target.y+90,x+80,target.y+90,1.7+i*.4);}
  else if(move===1){volley(a,5+phase*2,.22,180,'burn');for(let i=0;i<n;i++)circle(e.x+Math.cos(a+i*.5)*190,e.y+Math.sin(a+i*.5)*190,60,1.3,2,'burn');}
  else {circle(target.x,target.y,135,1.5,.6,'stun');ring(target.x,target.y,300,220,2.1);}break;
 case 'coil':
  if(move===0){ring(target.x,target.y,280,200,1.25,'poison');ring(target.x,target.y,160,80,2.25,'poison');}
  else if(move===1){ray(a-.2,630,1.2,'poison');ray(a+.2,630,1.2,'poison');if(phase)circle(target.x,target.y,60,2);}
  else for(let i=0;i<7+phase;i++){const theta=i*.8;circle(e.x+Math.cos(theta)*(85+i*24),e.y+Math.sin(theta)*(85+i*24),48,1+i*.17,.5,'poison');}break;
 case 'tide':
  if(move===0)for(let row=0;row<n;row++){const y=target.y-250+row*145;line(target.x-430,y,target.x-70,y,1.2+row*.5,36,'slow');line(target.x+80,y,target.x+430,y,1.2+row*.5,36,'slow');}
  else if(move===1){ring(e.x,e.y,360,190,1.3,'slow');circle(target.x,target.y,85,2,1,'slow');}
  else {volley(a-.5,4+phase,.16,150,'slow');volley(a+.5,4+phase,.16,270,'slow');}break;
 case 'glacier':
  if(move===0)for(let i=0;i<n+2;i++)circle(target.x-220+i*85,target.y+(i%2?100:-100),60,1.1+i*.2,1.5,'freeze');
  else if(move===1)for(let i=0;i<5+phase;i++)ray(a+i*TAU/(5+phase),460,1.4+i*.15,'freeze');
  else {volley(a,9+phase*2,.13,220,'freeze');ring(target.x,target.y,220,145,1.6,'freeze');}break;
 case 'clock':
  if(move===0){ray(a,620,1.1,'slow');ray(a+Math.PI/2,450,1.8,'slow');ray(a+Math.PI,620,2.5,'slow');}
  else if(move===1)for(let i=0;i<12;i++)circle(target.x+Math.cos(i*TAU/12)*220,target.y+Math.sin(i*TAU/12)*220,42,1+i*.13,.45,'stun');
  else {circle(target.x,target.y,85,1.2,.4,'slow');circle(target.x,target.y,135,2.5,.5,'slow');e.teleport={...point(target.x+210,target.y-150),t:1.5};circle(e.teleport.x,e.teleport.y,60,1.5);}break;
 case 'mirror':
  if(move===0){for(let i=-1;i<=1;i++){line(e.x+i*120,e.y,target.x-i*170,target.y+170,1.3+i*.1);line(target.x-i*170,target.y+170,target.x+i*170,target.y-100,2.2);}}
  else if(move===1)for(let side of [-1,1]){circle(target.x+side*180,target.y,90,1.1,1);line(target.x+side*180,target.y-200,target.x-side*180,target.y+200,2.1);}
  else for(let i=0;i<3;i++)volley(a+(i-1)*.65,4+phase,.16,150+i*65);break;
 case 'furnace':
  if(move===0)for(let i=0;i<n;i++){const y=target.y-250+i*150;line(target.x-380,y,target.x-80,y,1+i*.4,45,'burn');line(target.x+80,y,target.x+380,y,1+i*.4,45,'burn');}
  else if(move===1){circle(e.x,e.y,260,1.5,2,'burn');for(let i=0;i<n;i++)circle(target.x+Math.cos(i*2)*160,target.y+Math.sin(i*2)*160,70,1.8+i*.3,.5,'burn');}
  else for(let i=0;i<8+phase*2;i++)shot(e,e.x,e.y,i*TAU/(8+phase*2),180,{turn:.6,effect:'burn',life:5});break;
 case 'graveyard':
  if(move===0)for(let i=0;i<6+phase;i++)circle(target.x+(i%3-1)*140,target.y+(Math.floor(i/3)-.5)*180,45,1.2,3,'noregen');
  else if(move===1){summon(e,5+phase*2,newMinion,{effect:'noregen'});ring(e.x,e.y,300,200,1.6,'noregen');}
  else for(let i=0;i<n;i++)line(target.x-320,target.y-220+i*100,target.x+320,target.y+120+i*100,1.2+i*.3,22,'noregen');break;
 case 'null':
  if(move===0){circle(target.x,target.y,150,1.4,1.5,'silence');for(let i=0;i<n;i++)ray(a+(i-1)*.65,450,2,'silence');}
  else if(move===1){volley(a,5+phase*2,.2,230,'disarm');ring(target.x,target.y,280,160,1.5,'disarm');}
  else {line(target.x-400,target.y,target.x+400,target.y,1.3,40,'silence');line(target.x,target.y-400,target.x,target.y+400,2.1,40,'disarm');e.teleport={...point(target.x-220,target.y-150),t:2.3};}break;
 case 'starfall':
  if(move===0)for(let i=0;i<5;i++){const a0=i*TAU/5,a1=(i+2)*TAU/5;line(target.x+Math.cos(a0)*240,target.y+Math.sin(a0)*240,target.x+Math.cos(a1)*240,target.y+Math.sin(a1)*240,1.2+i*.2,18);}
  else if(move===1)for(let i=0;i<5+phase;i++)line(target.x-300+i*100,target.y-350,target.x-140+i*100,target.y+350,1.1+i*.25,35,'burn');
  else {for(let side of [-1,1]){const at={x:e.x+side*170,y:e.y};fan(e,at,a-side*.25,5+phase,.18,210);circle(at.x,at.y,100,1.6,.6);}ring(target.x,target.y,270,180,2);}break;
 case 'eclipse':
  if(move===0)for(let i=0;i<6+phase;i++){const t=i*Math.PI/(5+phase);circle(target.x+Math.cos(t)*240,target.y+Math.sin(t)*240,70,1.1+i*.15,.6,'silence');}
  else if(move===1){ring(target.x,target.y,430,100,1.6,'silence');circle(target.x,target.y,80,2.7,.6,'disarm');}
  else for(let i=0;i<4+phase;i++){const t=i*TAU/(4+phase);line(target.x+Math.cos(t)*400,target.y+Math.sin(t)*400,target.x-Math.cos(t)*400,target.y-Math.sin(t)*400,1.2+i*.4,20,i%2?'silence':'disarm');}break;
 }
 return true;
}
