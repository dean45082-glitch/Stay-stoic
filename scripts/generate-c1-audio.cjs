'use strict';

const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const {validate,snapshot}=require('./generate-audio.cjs');

const VOICE_ID='WbNN0ZquKxio6sawH5yC';
const VOICE_LABEL='NY sofisticado';
const MODEL_ID='eleven_flash_v2_5';
const FORMAT='mp3_44100_128';
const BATCH_ID='2026-11-12-c1-primary';
const MAX_DAY=42;
const HARD_CAP=9500;
const COST_PER_CHARACTER=0.5;
const SETTINGS={stability:0.5,similarity_boost:0.75,style:0,use_speaker_boost:true,speed:1};

function readJSON(file,fallback){return fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):fallback;}
function writeJSON(file,data){fs.writeFileSync(file+'.tmp',JSON.stringify(data,null,2)+'\n');fs.renameSync(file+'.tmp',file);}
function hashText(text){return crypto.createHash('sha256').update(Buffer.from(text,'utf8')).digest('hex');}
function normalize(text){return String(text||'').normalize('NFC').replace(/\s+/g,' ').trim();}
function chars(text){return [...text].length;}

function loadC1(root){
  const source=fs.readFileSync(path.join(root,'c1-data.js'),'utf8');
  const context={window:{}};
  vm.runInNewContext(source,context,{filename:'c1-data.js'});
  const course=context.window.C1_COURSE;
  if(!course||!Array.isArray(course.days)||course.days.length!==69)throw Error('Invalid C1 course data');
  return course;
}

function buildManifest(root,store){
  const course=loadC1(root);
  const index=readJSON(path.join(store,'audio-index.json'),{entries:{}});
  const existing=new Set(Object.keys(index.entries||{}).map(normalize));
  const seen=new Set();
  const items=[];
  for(const day of course.days){
    if(day.day>MAX_DAY)break;
    const dayTexts=[];
    for(const text of day.models||[])dayTexts.push({type:'model',text});
    if(day.reading)dayTexts.push({type:'reading',text:day.reading});
    for(const part of dayTexts){
      const text=normalize(part.text);
      if(!text||seen.has(text)||existing.has(text))continue;
      seen.add(text);
      const id=hashText(text);
      items.push({
        id,text,
        credits:Math.ceil(chars(text)*COST_PER_CHARACTER),
        group:'c1-day-'+day.day+'-'+part.type,
        aliases:[text],
        day:day.day,
        type:part.type
      });
    }
  }
  const estimatedCredits=items.reduce((n,i)=>n+i.credits,0);
  if(estimatedCredits>HARD_CAP)throw Error('Planned C1 batch exceeds hard cap: '+estimatedCredits);
  return {
    version:1,
    profile:{voiceId:VOICE_ID,modelId:MODEL_ID,format:FORMAT,settings:SETTINGS},
    items,
    firstBatch:{id:BATCH_ID,cap:HARD_CAP,estimatedCredits,ids:items.map(i=>i.id)}
  };
}

async function safeSubscription(key){
  try{
    const response=await fetch('https://api.elevenlabs.io/v1/user/subscription',{
      headers:{'xi-api-key':key},signal:AbortSignal.timeout(30000)
    });
    if(!response.ok){
      console.log(JSON.stringify({subscriptionCheck:'unavailable',http:response.status}));
      return null;
    }
    const d=await response.json();
    const used=Number.isFinite(d.character_count)?d.character_count:null;
    const limit=Number.isFinite(d.character_limit)?d.character_limit:null;
    const remaining=used!==null&&limit!==null?Math.max(0,limit-used):null;
    const reset=Number.isFinite(d.next_character_count_reset_unix)
      ? new Date(d.next_character_count_reset_unix*1000).toISOString():null;
    const safe={tier:d.tier||null,status:d.status||null,used,limit,remaining,nextResetUtc:reset};
    console.log(JSON.stringify({subscription:safe}));
    return safe;
  }catch{
    console.log(JSON.stringify({subscriptionCheck:'unavailable',reason:'network-or-permission'}));
    return null;
  }
}

function persistFactory(store){
  return message=>{
    execFileSync('git',['add','audio','ledger.json','audio-index.js','audio-index.json'],{cwd:store,stdio:'pipe'});
    const dirty=execFileSync('git',['status','--porcelain'],{cwd:store,encoding:'utf8'});
    if(!dirty)return;
    execFileSync('git',['commit','-m',message],{cwd:store,stdio:'pipe'});
    execFileSync('git',['push','origin','HEAD:audio-assets'],{cwd:store,stdio:'pipe',timeout:120000});
  };
}

async function run({store,live}){
  const root=path.resolve(__dirname,'..');
  fs.mkdirSync(path.join(store,'audio'),{recursive:true});
  const manifest=buildManifest(root,store);
  const ledgerPath=path.join(store,'ledger.json');
  const ledger=readJSON(ledgerPath,{version:2,entries:{},batches:{}});
  ledger.version=Math.max(2,ledger.version||1);
  ledger.entries=ledger.entries||{};
  ledger.batches=ledger.batches||{};

  const pending=[];
  for(const item of manifest.items){
    const old=ledger.entries[item.id];
    if(old?.status==='complete'){
      validate(path.join(store,'audio',item.id+'.mp3'),old.sha256,true);
      continue;
    }
    if(old)throw Error('Previous unresolved C1 request: '+item.id+'; reconcile before retry');
    pending.push(item);
  }

  const pendingCredits=pending.reduce((n,i)=>n+i.credits,0);
  const pendingChars=pending.reduce((n,i)=>n+chars(i.text),0);
  const summary={
    batch:BATCH_ID,
    voice:VOICE_LABEL,
    voiceId:VOICE_ID,
    model:MODEL_ID,
    maxDay:MAX_DAY,
    plannedItems:manifest.items.length,
    alreadyComplete:manifest.items.length-pending.length,
    pending:pending.length,
    pendingCharacters:pendingChars,
    estimatedCredits:pendingCredits,
    hardCap:HARD_CAP
  };
  console.log(JSON.stringify(summary));

  if(!live){
    snapshot(manifest,ledger,store);
    return summary;
  }

  const key=process.env.ELEVENLABS_API_KEY;
  if(!key)throw Error('Missing ELEVENLABS_API_KEY');
  if(!pending.length){
    snapshot(manifest,ledger,store);
    return summary;
  }

  const subscription=await safeSubscription(key);
  if(subscription?.remaining!==null && subscription.remaining < pendingCredits+100){
    throw Error('Insufficient renewed credits: need '+(pendingCredits+100)+' including safety margin, have '+subscription.remaining);
  }

  execFileSync('ffmpeg',['-version'],{stdio:'pipe',timeout:10000});
  const persist=persistFactory(store);

  for(const item of pending){
    ledger.entries[item.id]={
      status:'reserved',batch:BATCH_ID,estimatedCredits:item.credits,
      voiceId:VOICE_ID,voiceLabel:VOICE_LABEL,modelId:MODEL_ID,day:item.day,type:item.type
    };
  }
  ledger.batches[BATCH_ID]={
    status:'running',cap:HARD_CAP,estimatedCredits:manifest.firstBatch.estimatedCredits,
    voiceId:VOICE_ID,voiceLabel:VOICE_LABEL,modelId:MODEL_ID,maxDay:MAX_DAY
  };
  writeJSON(ledgerPath,ledger);
  persist('Reserve C1 NY sofisticado renewal batch');

  let attempted=0,generated=0;
  try{
    for(const item of pending){
      attempted++;
      ledger.entries[item.id].status='in_flight';
      writeJSON(ledgerPath,ledger);

      const response=await fetch(
        'https://api.elevenlabs.io/v1/text-to-speech/'+VOICE_ID+'?output_format='+FORMAT,
        {
          method:'POST',
          headers:{'xi-api-key':key,'Content-Type':'application/json'},
          body:JSON.stringify({text:item.text,model_id:MODEL_ID,voice_settings:SETTINGS}),
          signal:AbortSignal.timeout(60000)
        }
      );
      if(!response.ok)throw Error('ElevenLabs HTTP '+response.status+'; stopped without retry');

      const bytes=Buffer.from(await response.arrayBuffer());
      const target=path.join(store,'audio',item.id+'.mp3');
      fs.writeFileSync(target,bytes);
      const valid=validate(target,null,true);
      ledger.entries[item.id]={
        status:'complete',batch:BATCH_ID,estimatedCredits:item.credits,
        bytes:valid.bytes,sha256:valid.sha256,
        voiceId:VOICE_ID,voiceLabel:VOICE_LABEL,modelId:MODEL_ID,day:item.day,type:item.type
      };
      writeJSON(ledgerPath,ledger);
      generated++;

      if(generated%10===0){
        snapshot(manifest,ledger,store);
        persist('Save C1 NY sofisticado audio '+generated);
        console.log('Completed '+generated+'/'+pending.length);
      }
    }
    ledger.batches[BATCH_ID].status='complete';
  }catch(error){
    for(const item of pending.slice(attempted))delete ledger.entries[item.id];
    ledger.batches[BATCH_ID].status='stopped';
    throw error;
  }finally{
    writeJSON(ledgerPath,ledger);
    snapshot(manifest,ledger,store);
    persist('Checkpoint C1 NY sofisticado batch '+ledger.batches[BATCH_ID].status);
  }
  return {...summary,generated};
}

if(require.main===module){
  const store=path.resolve(process.argv[2]||'audio-store');
  const live=process.argv.includes('--generate');
  if(process.argv.slice(3).some(x=>!['--generate','--dry-run'].includes(x)))throw Error('Unknown option');
  run({store,live})
    .then(result=>console.log(JSON.stringify(result)))
    .catch(e=>{console.error(e.message);process.exitCode=1;});
}

module.exports={run,buildManifest};
