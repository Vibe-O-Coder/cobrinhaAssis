import {ctx} from './canvas.js';
import {FRUITS} from '../game/fruits.js';
import {save} from '../core/save.js';

export function drawFruit(type,x,y){
  const f=FRUITS[type];if(!f)return false;
  ctx.save();ctx.translate(x,y);ctx.lineWidth=1.5;ctx.strokeStyle='#17232b';ctx.fillStyle=f.color;
  if(save.art==='emoji'){
    ctx.font='22px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(f.icon,0,0);
    if(type==='green_grape'){ctx.fillStyle=f.color;ctx.fillRect(-8,11,16,3);}
  }else if(type==='banana'){
    ctx.beginPath();ctx.moveTo(-10,-9);ctx.bezierCurveTo(-12,11,11,16,13,-6);ctx.bezierCurveTo(6,5,-2,8,-10,-9);ctx.fill();ctx.stroke();
    ctx.strokeStyle='#8d7131';ctx.beginPath();ctx.moveTo(-9,-8);ctx.quadraticCurveTo(0,10,11,-4);ctx.stroke();
  }else if(type.includes('grape')){
    for(const [a,b] of [[-5,-5],[5,-5],[-8,2],[2,3],[7,3],[-3,9],[2,14]]){ctx.beginPath();ctx.arc(a,b,4.5,0,Math.PI*2);ctx.fill();ctx.stroke();}
    ctx.strokeStyle='#80aa55';ctx.beginPath();ctx.moveTo(0,-9);ctx.quadraticCurveTo(0,-16,8,-13);ctx.stroke();
  }else if(type==='watermelon'){
    ctx.fillStyle='#55bb68';ctx.beginPath();ctx.arc(0,-5,14,0,Math.PI);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle='#ff667e';ctx.beginPath();ctx.arc(0,-5,11,0,Math.PI);ctx.fill();
    ctx.fillStyle='#38233a';for(const a of [.5,1.1,1.8,2.5]){ctx.beginPath();ctx.ellipse(Math.cos(a)*7,-4+Math.sin(a)*7,1,2,-a,0,Math.PI*2);ctx.fill();}
  }else if(type==='strawberry'){
    ctx.beginPath();ctx.moveTo(0,13);ctx.bezierCurveTo(-21,-2,-9,-15,0,-7);ctx.bezierCurveTo(9,-15,21,-2,0,13);ctx.fill();ctx.stroke();
    ctx.fillStyle='#ffdf9c';for(const [a,b] of [[-5,-2],[4,-2],[0,3],[0,8]])ctx.fillRect(a,b,1.5,2);
    ctx.fillStyle='#76c869';ctx.beginPath();ctx.moveTo(-8,-10);ctx.lineTo(0,-6);ctx.lineTo(8,-10);ctx.lineTo(1,-13);ctx.closePath();ctx.fill();
  }else{
    ctx.beginPath();ctx.ellipse(0,0,13,11,.3,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.strokeStyle='#9eaf53';for(const n of [-6,0,6]){ctx.beginPath();ctx.ellipse(n/2,0,4,10,.3,0,Math.PI*2);ctx.stroke();}
  }
  ctx.restore();return true;
}
