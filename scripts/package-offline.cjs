const fs=require('node:fs'),path=require('node:path');
const {validate,snapshot}=require('./generate-audio.cjs');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),store=path.resolve(process.argv[2]||'audio-store');
const ledger=JSON.parse(fs.readFileSync(path.join(store,'ledger.json'),'utf8'));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'audio-plan/manifest.json'),'utf8'));
snapshot(manifest,ledger,store);
for(const [id,r] of Object.entries(ledger.entries)){if(r.status==='complete')validate(path.join(store,'audio',id+'.mp3'),r.sha256);}
for(const target of [path.join(root,'offline-web'),path.join(root,'app/src/main/assets/www')]){
 fs.mkdirSync(target,{recursive:true});for(const file of ['index.html','app.js','data1.js','data2.js','audio-player.js','sw.js'])fs.copyFileSync(path.join(root,file),path.join(target,file));
 fs.cpSync(path.join(root,'vendor'),path.join(target,'vendor'),{recursive:true});
 fs.copyFileSync(path.join(store,'audio-index.js'),path.join(target,'audio-index.js'));fs.copyFileSync(path.join(store,'audio-index.json'),path.join(target,'audio-index.json'));
 fs.mkdirSync(path.join(target,'audio'),{recursive:true});for(const [id,r] of Object.entries(ledger.entries))if(r.status==='complete')fs.copyFileSync(path.join(store,'audio',id+'.mp3'),path.join(target,'audio',id+'.mp3'));
 for(const [src,dst] of [['app-icon.b64','app-icon.webp'],['seneca.b64','seneca.webp'],['epictetus.b64','epictetus.webp']])fs.writeFileSync(path.join(target,dst),Buffer.from(fs.readFileSync(path.join(root,src),'utf8'),'base64'));
 fs.writeFileSync(path.join(target,'manifest.json'),JSON.stringify({name:'Stay Stoic',short_name:'Stay Stoic',start_url:'./',display:'standalone',background_color:'#1C1B18',theme_color:'#1C1B18',icons:[{src:'app-icon.webp',sizes:'any',type:'image/webp',purpose:'any'}]}));
 const hash=crypto.createHash('sha256');for(const file of ['index.html','app.js','data1.js','data2.js','audio-player.js','audio-index.js','sw.js'])hash.update(fs.readFileSync(path.join(target,file)));
 const worker=fs.readFileSync(path.join(target,'sw.js'),'utf8').replace("stay-stoic-2.3.4",'stay-stoic-2.3.4-'+hash.digest('hex').slice(0,16));fs.writeFileSync(path.join(target,'sw.js'),worker);
}
const drawable=path.join(root,'app/src/main/res/drawable-nodpi');fs.mkdirSync(drawable,{recursive:true});fs.writeFileSync(path.join(drawable,'stoic_icon.webp'),Buffer.from(fs.readFileSync(path.join(root,'app-icon.b64'),'utf8'),'base64'));
console.log('Packaged '+Object.values(ledger.entries).filter(r=>r.status==='complete').length+' verified offline audio files.');
