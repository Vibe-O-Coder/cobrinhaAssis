import {ctx} from './canvas.js';
const cache=new Map();
// Rasterizar o brilho uma vez evita blur e gradiente por projétil a cada frame.
export function drawGlow(x,y,r,color='#b04dff') {
  let tile=cache.get(color);
  if(!tile) {
    tile=document.createElement('canvas');tile.width=tile.height=48;
    const c=tile.getContext('2d'),g=c.createRadialGradient(24,24,0,24,24,24);
    g.addColorStop(0,'#fff5ff');g.addColorStop(.3,color);g.addColorStop(1,'transparent');
    c.fillStyle=g;c.fillRect(0,0,48,48);if(cache.size>=80)cache.delete(cache.keys().next().value);cache.set(color,tile);
  }
  ctx.drawImage(tile,x-r,y-r,r*2,r*2);
}
