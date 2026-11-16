'use strict';
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const {validate}=require('./generate-audio.cjs');
const labels=['NY sofisticado','Eminem style','New Yorker Sifrino','New Yorker super slam','Maine Guy','Atlanta real','LA guy'];
const store=process.argv[2],batch='my-way-and-c1-through48',cap=13771,model='eleven_multilingual_v2';
const norm=t=>String(t).normalize('NFC').replace(/\s+/g,' ').trim();
const hash=t=>crypto.createHash('sha256').update(t).digest('hex');
const load=f=>JSON.parse(fs.readFileSync(store+'/'+f,'utf8'));
function save(f,v){fs.writeFileSync(store+'/'+f+'.tmp',JSON.stringify(v,null,2)+'\n');fs.renameSync(store+'/'+f+'.tmp',store+'/'+f);}
async function main(){
 const ctx=vm.createContext({React:{},window:{}});
 for(const f of ['data1.js','data2.js','app.js','c1-data.js']){const src=fs.readFileSync(f,'utf8');vm.runInContext(f==='app.js'?src.split('/* ===================== ICONO: BUSTO KINTSUGI')[0]:src,ctx);}
 const m1=vm.runInContext(`Array.from({length:150},(_,i)=>{const d=i+1;if(isExamDay(d))return [];const w=weekForDay(d),s=weekSlotsForDay(d,w);return [...w.vocab.map(x=>x[0]),...s.structureModel.map(x=>x.en),...deepReadingForDay(d,w,s.structureModel),...extraSlotsForDay(d).read.map(x=>x.phrase),w.ancla];})`,ctx);
 const m2=ctx.window.C1_COURSE.days.slice(0,48).map(d=>[...d.models,...d.shadowing,d.reading]);
 const ix=load('audio-index.json'),ledger=load('ledger.json');ledger.batches??={};
 const seen=new Set(Object.keys(ix.entries)),items=[],counts=labels.map(()=>0),spend=[0,0];
 for(const [m,ds,voices] of [[0,m1,[0,1]],[1,m2,[1,2,3,4,5,6]]]){
  const totals=labels.map(()=>0);
  ds.forEach((rows,i)=>{for(const raw of rows.filter(Boolean)){
   const alias=norm(raw);if(seen.has(alias))continue;seen.add(alias);
   const text=alias;
   const voice=voices.sort((a,b)=>totals[a]-totals[b]||a-b)[0],cost=[...text].length;
   spend[m]+=cost;totals[voice]+=cost;counts[voice]++;items.push({id:hash(batch+'\0'+alias),alias,text,voice,m,day:i+1,cost});
  }});
 }
 const total=spend[0]+spend[1]; console.log(JSON.stringify({spend,total,items:items.length,counts}));
 if(total>cap||!items.length)throw Error('Plan outside approved cap');
 if(!process.argv.includes('--live'))return;
 if(ledger.batches[batch]||items.some(x=>ledger.entries[x.id]))throw Error('Batch already exists');
 const api='https://api.elevenlabs.io',key=process.env.XI_KEY;if(!key)throw Error('Missing key');
 const get=async route=>{const r=await fetch(api+route,{headers:{'xi-api-key':key},signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('ElevenLabs access check HTTP '+r.status+' '+route);return r.json();};
 const sub=await get('/v1/user/subscription').catch(()=>null);
 if(sub&&Number.isFinite(sub.character_limit)&&Number.isFinite(sub.character_count)&&sub.character_limit-sub.character_count<total)throw Error('Insufficient credit balance');
 const id0='WbNN0ZquKxio6sawH5yC';const ny=await get('/v1/voices/'+id0);if(ny.voice_id!==id0||(ny.voice_multiplier??1)>1)throw Error('NY sofisticado not verified');
 const ids=[id0];for(const name of labels.slice(1)){const a=(await get('/v2/voices?search='+encodeURIComponent(name))).voices.filter(v=>v.name.toLowerCase()===name.toLowerCase());if(a.length!==1||a[0].category!=='generated'||(a[0].voice_multiplier??1)>1)throw Error('Voice unavailable: '+name);ids.push(a[0].voice_id);}
 const git=(...args)=>execFileSync('git',args,{cwd:store,stdio:'pipe',timeout:120000});
 const persist=msg=>{save('ledger.json',ledger);save('audio-index.json',ix);fs.writeFileSync(store+'/audio-index.js','window.STOIC_AUDIO_INDEX = '+JSON.stringify(ix)+';\n');git('add','audio','ledger.json','audio-index.json','audio-index.js');git('commit','-m',msg);git('push','origin','HEAD:audio-assets');};
 ledger.batches[batch]={status:'running',cap,estimate:total,completed:0};persist('Reserve My Way and C1 audio batch');
 for(const x of items){const voiceId=ids[x.voice],voiceLabel=labels[x.voice];
  const r=await fetch(api+'/v1/text-to-speech/'+voiceId+'?output_format=mp3_44100_128',{method:'POST',headers:{'xi-api-key':key,'Content-Type':'application/json'},body:JSON.stringify({text:x.text,model_id:model}),signal:AbortSignal.timeout(45000)});
  if(!r.ok)throw Error('TTS HTTP '+r.status+'; stopped without retry');
  const file='audio/'+x.id+'.mp3';fs.writeFileSync(store+'/'+file,Buffer.from(await r.arrayBuffer()));const {bytes,sha256}=validate(store+'/'+file,null,true);
  ledger.entries[x.id]={status:'complete',batch,estimatedCredits:x.cost,bytes,sha256,voiceId,voiceLabel,modelId:model,day:x.day,module:x.m+1};
  ix.voices??={};ix.voices[voiceId]={label:voiceLabel};ix.entries[x.alias]={file,bytes,sha256,voiceId,voiceLabel};
  const n=++ledger.batches[batch].completed;persist('Save My Way or C1 audio '+n+' of '+items.length);console.log('Saved '+n+'/'+items.length);
 }
 ledger.batches[batch].status='complete';persist('Complete My Way and C1 audio batch');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});