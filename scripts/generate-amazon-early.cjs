'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const store=path.resolve(process.argv[2]);
const live=process.argv.includes('--live');
const {validate}=require('./generate-audio.cjs');
const batch='amazon-early-gaps-2026-11';
const model='eleven_multilingual_v2';
const voiceNames=['Eminem style','New Yorker Sifrino','New Yorker super slam','Maine Guy','Atlanta real','LA guy'];
const read=name=>JSON.parse(fs.readFileSync(path.join(store,name),'utf8'));
const write=(name,data)=>fs.writeFileSync(path.join(store,name),data);
const key=process.env.XI_KEY;
const normalize=text=>text.normalize('NFC').replace(/\s+/g,' ').trim();
const size=text=>[...text].length;
const hash=text=>crypto.createHash('sha256').update(text).digest('hex');
const ledger=read('ledger.json'),index=read('audio-index.json');
const entries=index.entries;
const saved=entry=>entry&&/^audio\/[a-f0-9]{64}\.mp3$/.test(entry.file)&&fs.existsSync(path.join(store,entry.file));

function loadCourse(){
 const w={React:{createElement(){},useState(){},useEffect(){}}};
 const c=vm.createContext({window:w,console});
 for(const name of [...Array.from({length:18},(_,i)=>'amazon-data-part'+(i+1)+'.js'),'amazon-data.js','amazon-module.js']){
   vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),c,{filename:name});
 }
 if(w.AMAZON_COURSE?.lessons?.length!==74)throw Error('Expected 74 lessons');
 return w.AMAZON_COURSE;
}

function candidates(course){
 const vocab=new Map(course.vocabulary.map(x=>[x.id,x]));
 const known=new Map(), result=[], reused=[];
 function cases(d){
   const scope=(kind,i,j)=>'amazon-audio:'+d.id+':'+kind+':'+i+(j===undefined?'':':'+j);
   return [
     [d.scenario],...d.models.map((t,i)=>[t,scope('model',i)]),
     ...d.dialogue_variants.flatMap((ls,i)=>ls.map((l,j)=>[l.text,scope('dialogue',i,j)])),
     [d.objective],[d.short_application?.prompt],[d.short_application?.model],
     ...d.activities.flatMap(a=>[a.prompt,...(a.options||[]),...(a.cards||[]),a.correct_order?.join('. '),a.feedback].map(t=>[t])),
     ...d.vocabulary_ids.map(id=>[vocab.get(id)?.term])
   ].filter(([t])=>typeof t==='string'&&t.trim()).map(([t,k])=>[normalize(t),k]);
 }
 for(const day of course.lessons)for(const [text,lookup] of cases(day)){
   const existing=lookup&&entries[lookup]||entries[text];
   if(saved(existing)&&!known.has(text))known.set(text,existing);
 }
 const seen=new Set();
 for(const d of course.lessons)for(const [text,lookup] of cases(d)){
   if(entries[text]||(lookup&&entries[lookup])||seen.has(text))continue;
   seen.add(text);
   if(known.has(text)){reused.push({text,entry:known.get(text)});continue;}
   result.push({day:d.day,text,cost:size(text)});
 }
 return {result,reused};
}

async function api(route,body){
 const response=await fetch('https://api.elevenlabs.io'+route,{
   method:body?'POST':'GET',
   headers:{'xi-api-key':key,...(body?{'Content-Type':'application/json'}:{})},
   body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(45000)
 });
 if(!response.ok)throw Error('ElevenLabs HTTP '+response.status+' on '+route.split('?')[0].replace(/(\/text-to-speech\/).+/, '$1[voice]'));
 return body?Buffer.from(await response.arrayBuffer()):response.json();
}

function persist(message){
 write('ledger.json',JSON.stringify(ledger,null,2)+'\n');
 write('audio-index.json',JSON.stringify(index,null,2)+'\n');
 write('audio-index.js','window.STOIC_AUDIO_INDEX = '+JSON.stringify(index)+';\n');
 const git=(...args)=>execFileSync('git',args,{cwd:store,stdio:'pipe',timeout:120000});
 git('add','audio','ledger.json','audio-index.json','audio-index.js');
 git('commit','-m',message);
 git('push','origin','HEAD:audio-assets');
}

async function main(){
 const {result,reused}=candidates(loadCourse());
 let balance=8999;
 let voices=[];
 if(live){
   if(!key)throw Error('Missing ElevenLabs secret');
   if(ledger.batches?.[batch])throw Error('This paid batch must not be started twice');
   const dashboardCap=8339;
   const subscription=await api('/v1/user/subscription').catch(error=>{
     if(error.message==='ElevenLabs HTTP 401 on /v1/user/subscription')return null;
     throw error;
   });
   if(subscription&&(!Number.isFinite(subscription.character_limit)||!Number.isFinite(subscription.character_count)))throw Error('Could not verify remaining credits');
   const available=subscription?subscription.character_limit-subscription.character_count:dashboardCap;
   balance=Math.max(0,Math.min(dashboardCap,available));
   if(balance<8000)throw Error('Verified balance is below the expected 8,000 credits: '+balance);
   for(const label of voiceNames){
     const data=await api('/v2/voices?search='+encodeURIComponent(label));
     const matches=data.voices.filter(v=>v.name.toLowerCase()===label.toLowerCase());
     if(matches.length!==1||matches[0].category!=='generated'||(matches[0].voice_multiplier??1)>1)throw Error('Cannot verify standard-rate voice: '+label);
     voices.push({id:matches[0].voice_id,label});
   }
 }
 let estimated=0,n=0;
 for(const item of result){
   if(estimated+item.cost>balance)break;
   estimated+=item.cost;n++;
 }
 const selected=result.slice(0,n);
 const report={verifiedCap:balance,estimated,files:n,lastDay:selected.at(-1)?.day,firstRemainingDay:result[n]?.day,reused:reused.length};
 console.log(JSON.stringify(report));
 if(!live||!n)return;
 ledger.batches??={};
 const record=ledger.batches[batch]={...report,status:'running',completed:0};
 for(const {text,entry} of reused)entries[text]??=entry;
 persist('Reserve the capped early Amazon audio batch');
 try{
   for(const [i,item] of selected.entries()){
     const voice=voices[i%voices.length];
     const id=hash(batch+'\0'+voice.id+'\0'+item.text);
     if(ledger.entries[id]||entries[item.text])throw Error('Unexpected duplicate audio');
     const file='audio/'+id+'.mp3',tmp=file+'.tmp';
     let bytes;
     try{
       write(tmp,await api('/v1/text-to-speech/'+voice.id+'?output_format=mp3_44100_128',{text:item.text,model_id:model}));
       bytes=validate(path.join(store,tmp));
       fs.renameSync(path.join(store,tmp),path.join(store,file));
     }finally{fs.rmSync(path.join(store,tmp),{force:true});}
     const savedEntry={file,...bytes,voiceId:voice.id,voiceLabel:voice.label};
     ledger.entries[id]={status:'complete',batch,estimatedCredits:item.cost,...bytes,voiceId:voice.id,voiceLabel:voice.label,modelId:model,day:item.day};
     entries[item.text]=savedEntry;
     index.voices??={};
     index.voices[voice.id]??={label:voice.label};
     record.completed++;
     if(record.completed%10===0)persist('Save early Amazon audio '+record.completed+' of '+n);
   }
   record.status='complete';
   persist('Complete early Amazon audio batch');
   console.log(JSON.stringify(record));
 }catch(e){
   record.status='stopped';
   persist('Preserve completed early Amazon audio after stop');
   throw e;
 }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
