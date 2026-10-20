'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const {execFileSync}=require('node:child_process');

const OLD_VOICE_ID='WbNN0ZquKxio6sawH5yC';
const SECONDARY_VOICE_ID='VcxTwjcCv1kVfys2U7LT';
const TOTAL_BUDGET=10000;
const BATCH_ID='2026-10-20-secondary-renewal';
const profile={voiceId:SECONDARY_VOICE_ID,modelId:'eleven_multilingual_v2',format:'mp3_44100_128',settings:{stability:0.5,similarity_boost:0.75,style:0,use_speaker_boost:true,speed:1}};
const edits={'Discuss something (nunca "discuss about")':'Discuss something','Comes in (para productos)':'Comes in',"That's funny (irónico)":"That's funny",'wanna = want to':'Wanna. Want to.','gotta = have got to':'Gotta. Have got to.','gonna = going to':'Gonna. Going to.','(To be/get) off on the wrong foot':'To get off on the wrong foot','A drop in the bucket/ocean':'A drop in the bucket','although / though':'Although. Though.','what if...':'What if?'};
const deferred=new Set(['(To) beat','Are we still on for...?', "I'd rather... than..."]);

const clean=s=>s.normalize('NFC').replace(/\s+/g,' ').trim();
const spoken=raw=>{const original=clean(raw);if(deferred.has(original))return null;return clean(edits[original]||original.replace(/[()]/g,''));};
const write=(file,data)=>{fs.writeFileSync(file+'.tmp',JSON.stringify(data,null,2)+'\n');fs.renameSync(file+'.tmp',file);};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const idFor=text=>crypto.createHash('sha256').update(JSON.stringify({profile,text})).digest('hex');

function validateMp3(file){
 const b=fs.readFileSync(file);
 if(b.length<1000||!(b.subarray(0,3).toString()==='ID3'||(b[0]===255&&(b[1]&224)===224)))throw Error('Invalid MP3 response');
 execFileSync('ffmpeg',['-v','error','-xerror','-i',file,'-f','null','-'],{stdio:'pipe',timeout:30000});
 return {bytes:b.length,sha256:sha(b)};
}

function curriculumRows(root){
 const c=vm.createContext({React:{}});
 const src=['data1.js','data2.js','app.js'].map(f=>fs.readFileSync(path.join(root,f),'utf8'));
 vm.runInContext(src[0]+'\n'+src[1]+'\n'+src[2].split('/* ===================== ICONO: BUSTO KINTSUGI')[0],c,{timeout:5000});
 return vm.runInContext(`(()=>{const rows=[];for(let d=1;d<=150;d++){if(isExamDay(d))continue;const w=weekForDay(d),s=weekSlotsForDay(d,w),e=extraSlotsForDay(d);const add=(group,arr)=>{for(const text of arr||[])rows.push({day:d,week:w.id,group,text})};add('vocabulary',w.vocab.map(x=>x[0]));add('structures',s.structureModel.map(x=>x.en));add('reading',deepReadingForDay(d,w,s.structureModel));add('expressions',e.read.map(x=>x.phrase));add('seed',w.ancla?[w.ancla]:[]);}return rows;})()`,c,{timeout:5000});
}

function readStore(store){
 return {
  index:JSON.parse(fs.readFileSync(path.join(store,'audio-index.json'),'utf8')),
  ledger:JSON.parse(fs.readFileSync(path.join(store,'ledger.json'),'utf8'))
 };
}

function usedSecondaryCredits(ledger){
 return Object.values(ledger.entries||{}).filter(r=>r.batch===BATCH_ID).reduce((n,r)=>n+(Number(r.estimatedCredits)||0),0);
}

function plan(root,store){
 const {index,ledger}=readStore(store);
 const unresolved=Object.entries(ledger.entries||{}).filter(([,r])=>r.status!=='complete');
 if(unresolved.length)throw Error('Unresolved ledger entries exist; reconcile before any new request.');
 const used=usedSecondaryCredits(ledger);
 if(used>TOTAL_BUDGET)throw Error('Secondary credit ledger exceeds the authorized budget.');
 const remaining=TOTAL_BUDGET-used;

 const existingSpoken=new Set();
 for(const alias of Object.keys(index.entries||{})){const s=spoken(alias);if(s)existingSpoken.add(s);}
 const seen=new Set(),pending=[];
 for(const row of curriculumRows(root)){
  const original=clean(row.text),text=spoken(original);
  if(!text||seen.has(text))continue;
  seen.add(text);
  if(existingSpoken.has(text))continue;
  const credits=[...text].length;
  pending.push({...row,original,text,credits,id:idFor(text)});
 }

 const selected=[];let batchCredits=0;
 for(const item of pending){
  if(batchCredits+item.credits>remaining)break;
  selected.push(item);batchCredits+=item.credits;
 }
 return {used,remaining,batchCredits,selected,pendingCount:pending.length,remainingAfterBatch:pending.length-selected.length};
}

function normalizeMetadata(index,ledger){
 index.version=2;
 const defaultVoice=index.defaultVoice||index.voice||OLD_VOICE_ID;
 index.voice=defaultVoice;
 index.defaultVoice=defaultVoice;
 index.voices={...(index.voices||{}),[OLD_VOICE_ID]:{label:'NY sofisticado'},[SECONDARY_VOICE_ID]:{label:'Eminem style'}};
 for(const entry of Object.values(index.entries||{})){
  if(!entry.voiceId){entry.voiceId=OLD_VOICE_ID;entry.voiceLabel='NY sofisticado';}
 }
 ledger.version=2;
 ledger.voices={...(ledger.voices||{}),[OLD_VOICE_ID]:{label:'NY sofisticado'},[SECONDARY_VOICE_ID]:{label:'Eminem style'}};
 ledger.batches=ledger.batches||{};
 for(const row of Object.values(ledger.entries||{})){
  if(!row.voiceId&&row.status==='complete'){row.voiceId=OLD_VOICE_ID;row.voiceLabel='NY sofisticado';}
 }
}

function saveIndex(store,index){
 write(path.join(store,'audio-index.json'),index);
 fs.writeFileSync(path.join(store,'audio-index.js'),'window.STOIC_AUDIO_INDEX = '+JSON.stringify(index)+';\n');
}

function persist(store,message){
 execFileSync('git',['add','audio','ledger.json','audio-index.json','audio-index.js'],{cwd:store,stdio:'pipe'});
 const dirty=execFileSync('git',['status','--porcelain'],{cwd:store,encoding:'utf8'});
 if(!dirty)return;
 execFileSync('git',['commit','-m',message],{cwd:store,stdio:'pipe'});
 execFileSync('git',['push','origin','HEAD:audio-assets'],{cwd:store,stdio:'inherit',timeout:120000});
}

async function generate(root,store,live){
 const p=plan(root,store);
 console.log(JSON.stringify({planningOnly:!live,voiceId:SECONDARY_VOICE_ID,totalBudget:TOTAL_BUDGET,alreadyUsed:p.used,remainingBeforeBatch:p.remaining,estimatedCredits:p.batchCredits,files:p.selected.length,pendingBeforeBatch:p.pendingCount,remainingAfterBatch:p.remainingAfterBatch,first:p.selected[0]||null,last:p.selected.at(-1)||null},null,2));
 if(!live)return p;
 if(!process.env.ELEVENLABS_API_KEY_SECONDARY)throw Error('Missing secondary API secret.');
 if(!p.selected.length)return p;

 const {index,ledger}=readStore(store);
 if(ledger.batches?.[BATCH_ID])throw Error('Secondary batch already exists; refusing automatic rerun.');
 normalizeMetadata(index,ledger);
 ledger.batches[BATCH_ID]={status:'running',voiceId:SECONDARY_VOICE_ID,voiceLabel:'Eminem style',totalBudget:TOTAL_BUDGET,usedBefore:p.used,estimatedCredits:p.batchCredits,files:p.selected.length};
 for(const item of p.selected){
  if(ledger.entries[item.id])throw Error('Planned secondary ID already exists; refusing duplicate generation.');
  ledger.entries[item.id]={status:'reserved',batch:BATCH_ID,estimatedCredits:item.credits,voiceId:SECONDARY_VOICE_ID,voiceLabel:'Eminem style',text:item.text,original:item.original,day:item.day,week:item.week,group:item.group};
 }
 write(path.join(store,'ledger.json'),ledger);saveIndex(store,index);
 persist(store,'Reserve approved secondary audio batch');

 let current=null;
 try{
  for(let i=0;i<p.selected.length;i++){
   const item=p.selected[i];current=item;
   const row=ledger.entries[item.id];
   if(row.status!=='reserved')throw Error('Reserved state changed before request; refusing to continue.');
   row.status='in_flight';
   write(path.join(store,'ledger.json'),ledger);
   persist(store,'Mark secondary audio '+(i+1)+' of '+p.selected.length+' in flight');

   const response=await fetch('https://api.elevenlabs.io/v1/text-to-speech/'+SECONDARY_VOICE_ID+'?output_format='+profile.format,{
    method:'POST',
    headers:{'xi-api-key':process.env.ELEVENLABS_API_KEY_SECONDARY,'Content-Type':'application/json'},
    body:JSON.stringify({text:item.text,model_id:profile.modelId,voice_settings:profile.settings}),
    signal:AbortSignal.timeout(60000)
   });
   if(!response.ok){
    row.status='stopped_http_'+response.status;
    for(const later of p.selected.slice(i+1))delete ledger.entries[later.id];
    ledger.batches[BATCH_ID].status='stopped';
    ledger.batches[BATCH_ID].stoppedAt=i+1;
    write(path.join(store,'ledger.json'),ledger);
    persist(store,'Stop secondary audio batch after HTTP '+response.status);
    throw Error('ElevenLabs HTTP '+response.status+'; stopped without retry.');
   }

   const bytes=Buffer.from(await response.arrayBuffer());
   const target=path.join(store,'audio',item.id+'.mp3');
   fs.writeFileSync(target,bytes);
   const valid=validateMp3(target);
   row.status='complete';row.bytes=valid.bytes;row.sha256=valid.sha256;

   const newEntry={file:'audio/'+item.id+'.mp3',sha256:valid.sha256,bytes:valid.bytes,voiceId:SECONDARY_VOICE_ID,voiceLabel:'Eminem style'};
   index.entries[item.original]=newEntry;
   if(item.text!==item.original)index.entries[item.text]=newEntry;
   write(path.join(store,'ledger.json'),ledger);saveIndex(store,index);
   persist(store,'Save secondary audio '+(i+1)+' of '+p.selected.length);
   console.log(JSON.stringify({completed:i+1,total:p.selected.length,week:item.week,day:item.day,credits:item.credits,text:item.text}));
   current=null;
  }
  ledger.batches[BATCH_ID].status='complete';
  ledger.batches[BATCH_ID].completedCredits=p.batchCredits;
  write(path.join(store,'ledger.json'),ledger);saveIndex(store,index);
  persist(store,'Complete secondary ElevenLabs audio batch');
  return p;
 }catch(error){
  if(current){
   const idx=p.selected.findIndex(x=>x.id===current.id);
   for(const later of p.selected.slice(idx+1))if(ledger.entries[later.id]?.status==='reserved')delete ledger.entries[later.id];
   if(ledger.batches[BATCH_ID]){
    ledger.batches[BATCH_ID].status='stopped';
    ledger.batches[BATCH_ID].error='manual_reconciliation_required';
   }
   const target=path.join(store,'audio',current.id+'.mp3');
   if(fs.existsSync(target)&&ledger.entries[current.id]?.status!=='complete')fs.rmSync(target);
   write(path.join(store,'ledger.json'),ledger);saveIndex(store,index);
   try{persist(store,'Checkpoint stopped secondary audio batch');}catch{}
  }
  throw error;
 }
}

if(require.main===module){
 const root=path.resolve(__dirname,'..');
 const store=path.resolve(process.argv[2]||'audio-store');
 const live=process.argv.includes('--generate');
 if(process.argv.slice(3).some(x=>!['--generate','--dry-run'].includes(x)))throw Error('Unknown option');
 generate(root,store,live).then(()=>{}).catch(e=>{console.error(e.message);process.exitCode=1;});
}
module.exports={plan,generate,spoken,profile,OLD_VOICE_ID,SECONDARY_VOICE_ID,TOTAL_BUDGET};
