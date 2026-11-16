'use strict';
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const {validate}=require('./generate-audio.cjs');
const names=['Eminem style','New Yorker Sifrino','New Yorker super slam','Maine Guy','Atlanta real'];
const norm=t=>String(t).normalize('NFC').replace(/\s+/g,' ').trim();
const hash=t=>crypto.createHash('sha256').update(t).digest('hex');
const original='amazon-five-voices-01',batch='amazon-five-voices-02',cap=25300,model='eleven_multilingual_v2';
const store=process.argv[2];
const load=f=>JSON.parse(fs.readFileSync(store+'/'+f,'utf8'));
function save(f,v){fs.writeFileSync(store+'/'+f+'.tmp',JSON.stringify(v,null,2)+'\n');fs.renameSync(store+'/'+f+'.tmp',store+'/'+f);}
const scope=(d,k,i,j)=>'amazon-audio:'+d+':'+k+':'+i+(j===undefined?'':':'+j);
function plan(course){
 const items=new Map(),totals=names.map(()=>0),byRole={};let last=0;
 for(const d of course.lessons){
  const added=new Map(),cost=totals.slice(),roles=structuredClone(byRole),spoken=new Map();
  const add=(raw,voice,alias)=>{const text=norm(raw);if(!text)throw Error('Empty Amazon text');const id=hash(original+'\0'+voice+'\0'+text);if(!added.has(id)){added.set(id,{id,text,voice,aliases:[],day:d.day});if(!items.has(id))cost[voice]+=[...text].length;}added.get(id).aliases.push(alias);};
  d.dialogue_variants.forEach((lines,i)=>{
   const used=new Set(),speakers=new Set(lines.map(l=>l.speaker)),assigned={};
   if(speakers.size>names.length)throw Error('Too many voices');
   for(const role of speakers){
    const previous=roles[role]??=names.map(()=>0);
    const choices=names.map((_,v)=>v).filter(v=>!used.has(v)).sort((a,b)=>(cost[a]+previous[a]*75)-(cost[b]+previous[b]*75)||((a+d.day+i)%5)-((b+d.day+i)%5));
    assigned[role]=choices[0];used.add(choices[0]);previous[choices[0]]++;
   }
   lines.forEach((l,j)=>{const v=assigned[l.speaker];add(l.text,v,scope(d.id,'dialogue',i,j));spoken.set(norm(l.text),v);});
  });
  d.models.forEach((t,i)=>{const v=spoken.get(norm(t))??cost.indexOf(Math.min(...cost));add(t,v,scope(d.id,'model',i));});
  if(cost.reduce((a,b)=>a+b,0)>cap+9963)break;
  for(const [id,item] of added){if(items.has(id))items.get(id).aliases.push(...item.aliases);else items.set(id,item);}
  totals.splice(0,5,...cost);Object.assign(byRole,roles);last=d.day;
 }
 return {items:[...items.values()],totals,last};
}
async function main(){
 const ctx={window:{}};for(const f of [...Array.from({length:18},(_,i)=>'amazon-data-part'+(i+1)+'.js'),'amazon-data.js'])vm.runInNewContext(fs.readFileSync(f,'utf8'),ctx);
 const p=plan(ctx.window.AMAZON_COURSE);const ix=load('audio-index.json'),ledger=load('ledger.json');const pending=p.items.filter(x=>ledger.entries[x.id]?.status!=='complete');const estimate=pending.reduce((n,x)=>n+[...x.text].length,0);
 console.log(JSON.stringify({throughDay:p.last,estimate,voices:names.map((name,i)=>({name,credits:pending.filter(x=>x.voice===i).reduce((n,x)=>n+[...x.text].length,0),files:pending.filter(x=>x.voice===i).length}))}));
 if(!process.argv.includes('--live'))return;
 if(!p.last||estimate>cap||p.totals.some(n=>!n))throw Error('Invalid plan');
 ledger.batches??={};
 if(ledger.batches[original]?.status!=='complete'||ledger.batches[original].completed!==112||ledger.batches[batch]||pending.some(x=>ledger.entries[x.id]||x.aliases.some(a=>ix.entries[a])))throw Error('Previous batch not reconciled or current batch already exists');
 for(const item of p.items.filter(x=>ledger.entries[x.id]?.status==='complete')){const r=ledger.entries[item.id],file='audio/'+item.id+'.mp3';validate(store+'/'+file,r.sha256,false);for(const alias of item.aliases){if(ix.entries[alias]&&ix.entries[alias].file!==file)throw Error('Existing alias differs');ix.entries[alias]??={file,bytes:r.bytes,sha256:r.sha256,voiceId:r.voiceId,voiceLabel:r.voiceLabel};}}
 const api='https://api.elevenlabs.io',key=process.env.XI_KEY;if(!key)throw Error('Missing API key');
 const get=async route=>{const r=await fetch(api+route,{headers:{'xi-api-key':key},signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('ElevenLabs access check HTTP '+r.status);return r.json();};
 const sub=await get('/v1/user/subscription').catch(()=>null);
 if(sub&&Number.isFinite(sub.character_limit)&&Number.isFinite(sub.character_count)&&sub.character_limit-sub.character_count<estimate)throw Error('Insufficient credit balance');
 const ids=[];
 for(const name of names){const list=await get('/v2/voices?search='+encodeURIComponent(name));const found=list.voices.filter(v=>v.name.toLowerCase()===name.toLowerCase());if(found.length!==1||found[0].category!=='generated'||(found[0].voice_multiplier??1)>1)throw Error('Unable to verify standard-rate voice: '+name);ids.push(found[0].voice_id);}
 if(new Set(ids).size!==5)throw Error('Duplicate voice IDs');
 const git=(...args)=>execFileSync('git',args,{cwd:store,stdio:'pipe',timeout:120000});
 const persist=msg=>{save('ledger.json',ledger);save('audio-index.json',ix);fs.writeFileSync(store+'/audio-index.js','window.STOIC_AUDIO_INDEX = '+JSON.stringify(ix)+';\n');git('add','audio','ledger.json','audio-index.json','audio-index.js');git('commit','-m',msg);git('push','origin','HEAD:audio-assets');};
 ledger.batches[batch]={status:'running',cap,estimate,lastDay:p.last,completed:0};persist('Reserve Amazon five-voice audio batch');
 for(const item of pending){
  const voiceId=ids[item.voice],voiceLabel=names[item.voice];
  const r=await fetch(api+'/v1/text-to-speech/'+voiceId+'?output_format=mp3_44100_128',{method:'POST',headers:{'xi-api-key':key,'Content-Type':'application/json'},body:JSON.stringify({text:item.text,model_id:model}),signal:AbortSignal.timeout(45000)});
  if(!r.ok)throw Error('TTS HTTP '+r.status+'; stopped without retry');
  const file='audio/'+item.id+'.mp3';fs.writeFileSync(store+'/'+file,Buffer.from(await r.arrayBuffer()));
  const {bytes,sha256}=validate(store+'/'+file,null,true);
  ledger.entries[item.id]={status:'complete',batch,estimatedCredits:[...item.text].length,bytes,sha256,voiceId,voiceLabel,modelId:model,day:item.day};
  ix.voices??={};ix.voices[voiceId]={label:voiceLabel};
  for(const alias of item.aliases)ix.entries[alias]={file,bytes,sha256,voiceId,voiceLabel};
  const n=++ledger.batches[batch].completed;persist('Save Amazon audio '+n+' of '+pending.length);console.log('Saved '+n+'/'+pending.length);
 }
 ledger.batches[batch].status='complete';persist('Complete Amazon five-voice audio batch');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
