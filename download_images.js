// Script para baixar as imagens oficiais (official-artwork) de 1..1025
// Uso: `node download_images.js`

const fs = require('fs');
const path = require('path');
const https = require('https');

const TOTAL = 1025;
const CONCURRENCY = 8;
const OUTDIR = path.join(__dirname, 'images');

if(!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR);

async function fetchJson(url){
  return fetch(url).then(r=>{
    if(!r.ok) throw new Error(`${r.status}`);
    return r.json();
  });
}

function downloadUrlToFile(url, dest){
  return new Promise((resolve,reject)=>{
    const file = fs.createWriteStream(dest);
    https.get(url, res =>{
      if(res.statusCode !== 200){
        file.close(); fs.unlinkSync(dest); return reject(new Error('status '+res.statusCode));
      }
      res.pipe(file);
      file.on('finish', ()=> file.close(resolve));
    }).on('error', err =>{
      try{ file.close(); fs.unlinkSync(dest);}catch(e){}
      reject(err);
    });
  });
}

async function processId(id){
  const out = path.join(OUTDIR, `${String(id).padStart(3,'0')}.png`);
  if(fs.existsSync(out)) return {id, skipped:true};
  try{
    const data = await fetchJson(`https://pokeapi.co/api/v2/pokemon/${id}`);
    const url = data.sprites?.other?.['official-artwork']?.front_default || data.sprites?.front_default;
    if(!url) return {id, ok:false};
    await downloadUrlToFile(url, out);
    return {id, ok:true};
  }catch(err){
    return {id, ok:false, err: String(err)};
  }
}

async function run(){
  console.log('Iniciando download de imagens para', TOTAL, 'pokémons');
  let i=1;
  let success=0, fail=0, skipped=0;
  const queue = [];
  while(i<=TOTAL){
    while(queue.length < CONCURRENCY && i<=TOTAL){
      const id = i++;
      const p = processId(id).then(res=>{
        queue.splice(queue.indexOf(p),1);
        if(res.skipped) skipped++;
        else if(res.ok) success++; else fail++;
        console.log(`id=${res.id} ok=${res.ok} skipped=${!!res.skipped}` + (res.err? ' err='+res.err:''));
      });
      queue.push(p);
    }
    await Promise.race(queue).catch(()=>{});
  }
  await Promise.allSettled(queue);
  console.log('Concluído. success=', success, 'fail=', fail, 'skipped=', skipped);
}

run().catch(err=>{ console.error(err); process.exit(1); });
