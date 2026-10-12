'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function json(file,fallback){return fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):fallback;}
function write(file,data){fs.writeFileSync(file+'.tmp',JSON.stringify(data,null,2)+'\n');fs.renameSync(file+'.tmp',file);}
function validate(file,checksum,decode=true){
 const b=fs.readFileSync(file);if(checksum&&sha(b)!==checksum)throw Error('Audio checksum mismatch');
 if(b.length<1000||!(b.subarray(0,3).toString()==='ID3'||(b[0]===255&&(b[1]&224)===224)))throw Error('Invalid MP3 response');
 if(decode)execFileSync('ffmpeg',['-v','error','-xerror','-i',file,'-f','null','-'],{stdio:'pipe',timeout:30000});
 return {bytes:b.length,sha256:sha(b)};
}
function snapshot(manifest,ledger,store){
 const entries={};for(const item of manifest.items){const r=ledger.entries[item.id];if(r?.status!=='complete')continue;validate(path.join(store,'audio',item.id+'.mp3'),r.sha256,false);for(const alias of item.aliases)entries[alias]={file:'audio/'+item.id+'.mp3',sha256:r.sha256,bytes:r.bytes};}
 fs.writeFileSync(path.join(store,'audio-index.js'),'window.STOIC_AUDIO_INDEX = '+JSON.stringify({version:1,voice:manifest.profile.voiceId,entries})+';\n');
 write(path.join(store,'audio-index.json'),{version:1,voice:manifest.profile.voiceId,entries});
}
async function generate({manifest,store,live=false,persist=()=>{},request=fetch,decode=true}){
 fs.mkdirSync(path.join(store,'audio'),{recursive:true});
 const file=path.join(store,'ledger.json');const ledger=json(file,{version:1,entries:{},batches:{}});
 const batch=manifest.firstBatch;
 if(batch.cap!==9771||batch.id!=='2026-10-initial')throw Error('Unapproved generation budget or batch');
 const items=batch.ids.map(id=>{const item=manifest.items.find(x=>x.id===id);if(!item)throw Error('Unknown batch item');return item;});
 if(new Set(batch.ids).size!==batch.ids.length)throw Error('Duplicate batch IDs');
 const cost=items.reduce((n,i)=>n+[...i.text].length,0);
 if(cost>batch.cap||cost!==batch.estimatedCredits||items.some(x=>x.credits!==[...x.text].length))throw Error('Budget mismatch');
 const pending=[];for(const item of items){const old=ledger.entries[item.id];if(old?.status==='complete'){validate(path.join(store,'audio',item.id+'.mp3'),old.sha256,decode);continue;}if(old)throw Error('Previous unresolved request: '+item.id+'; refusing automatic retry');pending.push(item);}
 const estimate=pending.reduce((n,i)=>n+i.credits,0);
 const summary={batch:batch.id,alreadyComplete:items.length-pending.length,pending:pending.length,estimatedCredits:estimate,cap:batch.cap};
 console.log(JSON.stringify(summary));
 if(!live){snapshot(manifest,ledger,store);return summary;}
 if(!process.env.ELEVENLABS_API_KEY)throw Error('Missing API secret');
 if(ledger.batches[batch.id]?.status==='complete'&&pending.length)throw Error('Completed batch cannot be silently expanded');
 if(!pending.length){snapshot(manifest,ledger,store);return summary;}
 if(decode)execFileSync('ffmpeg',['-version'],{stdio:'pipe',timeout:10000});
 // Reserve the entire requested set durably before any billable request.
 for(const item of pending)ledger.entries[item.id]={status:'reserved',batch:batch.id,estimatedCredits:item.credits};
 ledger.batches[batch.id]={status:'running',cap:batch.cap,estimatedCredits:cost};
 write(file,ledger);persist('Reserve approved audio batch before generation');
 let attempted=0,generated=0;
 try {
  for(const item of pending){
   attempted++;ledger.entries[item.id].status='in_flight';write(file,ledger);
   const response=await request('https://api.elevenlabs.io/v1/text-to-speech/'+manifest.profile.voiceId+'?output_format='+manifest.profile.format,{method:'POST',headers:{'xi-api-key':process.env.ELEVENLABS_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({text:item.text,model_id:manifest.profile.modelId,voice_settings:manifest.profile.settings}),signal:AbortSignal.timeout(60000)});
   if(!response.ok)throw Error('ElevenLabs HTTP '+response.status+'; stopped without retry');
   const bytes=Buffer.from(await response.arrayBuffer());const target=path.join(store,'audio',item.id+'.mp3');fs.writeFileSync(target,bytes);
   const valid=validate(target,null,decode);
   ledger.entries[item.id]={status:'complete',batch:batch.id,estimatedCredits:item.credits,...valid};write(file,ledger);generated++;
   if(generated%10===0){snapshot(manifest,ledger,store);persist('Save '+generated+' generated audio files');console.log('Completed '+generated+'/'+pending.length);}
  }
  ledger.batches[batch.id].status='complete';
 } catch(error){
  // Later reservations were never sent; earlier/in-flight ones require reconciliation.
  for(const item of pending.slice(attempted))delete ledger.entries[item.id];
  ledger.batches[batch.id].status='stopped';throw error;
 } finally {
  write(file,ledger);snapshot(manifest,ledger,store);persist('Checkpoint audio batch '+ledger.batches[batch.id].status);
 }
 return {...summary,generated};
}
if(require.main===module){
 const store=path.resolve(process.argv[2]||'audio-store');const live=process.argv.includes('--generate');
 if(process.argv.slice(3).some(x=>!['--generate','--dry-run'].includes(x)))throw Error('Unknown option');
 const manifest=json(path.resolve(__dirname,'../audio-plan/manifest.json'));
 const persist=message=>{execFileSync('git',['add','audio','ledger.json','audio-index.js','audio-index.json'],{cwd:store,stdio:'pipe'});const dirty=execFileSync('git',['status','--porcelain'],{cwd:store,encoding:'utf8'});if(!dirty)return;execFileSync('git',['commit','-m',message],{cwd:store,stdio:'pipe'});execFileSync('git',['push','origin','HEAD:audio-assets'],{cwd:store,stdio:'pipe',timeout:120000});};
 generate({manifest,store,live,persist}).then(result=>console.log(JSON.stringify(result))).catch(e=>{console.error(e.message.startsWith('ElevenLabs HTTP')?e.message:'Audio process stopped: '+(e.message.startsWith('Previous unresolved')?e.message:'validation, storage or network failure; inspect saved state before retrying'));process.exitCode=1;});
}
module.exports={generate,validate,snapshot,sha};
