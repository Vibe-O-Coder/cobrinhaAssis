import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
  const page=await browser.newPage();
  await page.goto(process.env.TEST_URL||'http://127.0.0.1:8123');
  for(const file of fs.readdirSync('tracks').filter(f=>f.endsWith('.mp3'))) {
    const info=await page.evaluate(file=>new Promise((resolve,reject)=>{
      const audio=new Audio(new URL('tracks/'+file,location.href));
      audio.preload='metadata';
      audio.onloadedmetadata=()=>{const duration=audio.duration;audio.removeAttribute('src');audio.load();resolve({file,duration});};
      audio.onerror=()=>reject(new Error('Falha ao ler '+file));
    }),file);
    console.log(JSON.stringify(info));
  }
} finally {await browser.close();}
