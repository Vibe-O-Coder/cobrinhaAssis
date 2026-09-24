// Broad phase shared by separation and projectile collision; exact tests follow.
let querySerial = 0;
export class SpatialGrid {
  constructor(size = 128) { this.size=size; this.cells=new Map(); this.pool=[]; }
  rebuild(entities) {
    for(const bucket of this.cells.values()){bucket.length=0;this.pool.push(bucket);}
    this.cells.clear();
    for(const e of entities) {
      if(e.hp<=0)continue;
      const r=e.r||0,s=this.size;
      for(let y=Math.floor((e.y-r)/s);y<=Math.floor((e.y+r)/s);y++)for(let x=Math.floor((e.x-r)/s);x<=Math.floor((e.x+r)/s);x++) {
        const key=x+','+y;let bucket=this.cells.get(key);
        if(!bucket){bucket=this.pool.pop()||[];this.cells.set(key,bucket);}bucket.push(e);
      }
    }
  }
  query(x0,y0,x1,y1,out=[]) {
    out.length=0;const stamp=++querySerial,s=this.size;
    for(let y=Math.floor(y0/s);y<=Math.floor(y1/s);y++)for(let x=Math.floor(x0/s);x<=Math.floor(x1/s);x++) {
      const bucket=this.cells.get(x+','+y);if(!bucket)continue;
      for(const e of bucket)if(e._spatialStamp!==stamp){e._spatialStamp=stamp;out.push(e);}
    }return out;
  }
}
export function segmentCircle(x0,y0,x1,y1,cx,cy,r) {
  const dx=x1-x0,dy=y1-y0,t=Math.max(0,Math.min(1,((cx-x0)*dx+(cy-y0)*dy)/(dx*dx+dy*dy||1)));
  const x=x0+t*dx-cx,y=y0+t*dy-cy;return x*x+y*y<=r*r;
}
