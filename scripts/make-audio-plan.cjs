const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const clean=s=>s.normalize('NFC').replace(/\s+/g,' ').trim();
const profile={voiceId:'WbNN0ZquKxio6sawH5yC',modelId:'eleven_multilingual_v2',format:'mp3_44100_128',settings:{stability:0.5,similarity_boost:0.75,style:0,use_speaker_boost:true,speed:1}};
const edits={'Discuss something (nunca "discuss about")':'Discuss something','Comes in (para productos)':'Comes in',"That's funny (irónico)":"That's funny",'wanna = want to':'Wanna. Want to.','gotta = have got to':'Gotta. Have got to.','gonna = going to':'Gonna. Going to.','(To be/get) off on the wrong foot':'To get off on the wrong foot','A drop in the bucket/ocean':'A drop in the bucket','although / though':'Although. Though.','what if...':'What if?'};
// Incomplete prompts keep native TTS until their teaching content is clarified.
const deferred=new Set(['(To) beat','Are we still on for...?',"I'd rather... than..."]);
function build(){
 const c=vm.createContext({React:{}});const src=['data1.js','data2.js','app.js'].map(f=>fs.readFileSync(path.join(root,f),'utf8'));
 vm.runInContext(src[0]+'\n'+src[1]+'\n'+src[2].split('/* ===================== ICONO: BUSTO KINTSUGI')[0],c,{timeout:3000});
 const groups=vm.runInContext(`(()=>{const g={expressions:[],vocabulary:[],structures:[],reading:[],seeds:[]};for(let d=1;d<=TOTAL_DAYS;d++){if(isExamDay(d))continue;const w=weekForDay(d),s=weekSlotsForDay(d,w),e=extraSlotsForDay(d);g.expressions.push(...e.read.map(x=>x.phrase));g.vocabulary.push(...w.vocab.map(x=>x[0]));g.structures.push(...s.structureModel.map(x=>x.en));g.reading.push(...deepReadingForDay(d,w,s.structureModel));g.seeds.push(w.ancla,...e.read.map(x=>x.phrase));}return g;})()`,c,{timeout:3000});
 const map=new Map(),changes=[],skipped=[];
 for(const [group,texts] of Object.entries(groups))for(const raw of texts){const original=clean(raw);if(deferred.has(original)){if(!skipped.includes(original))skipped.push(original);continue;}
  const text=edits[original]||original.replace(/[()]/g,'');
  const id=crypto.createHash('sha256').update(JSON.stringify({profile,text})).digest('hex');
  if(!map.has(id))map.set(id,{id,text,credits:[...text].length,group,aliases:[]});
  const item=map.get(id);if(!item.aliases.includes(original))item.aliases.push(original);
  if(text!==original&&!changes.some(x=>x.original===original))changes.push({original,spoken:text});
 }
 const items=[...map.values()];let used=0;const batch=[];for(const item of items){if(used+item.credits>9771)break;batch.push(item.id);used+=item.credits;}
 return {version:1,profile,items,changes,deferred:skipped,firstBatch:{id:'2026-10-initial',cap:9771,estimatedCredits:used,ids:batch}};
}
if(require.main===module){const p=build();fs.mkdirSync(path.join(root,'audio-plan'),{recursive:true});fs.writeFileSync(path.join(root,'audio-plan/manifest.json'),JSON.stringify(p,null,2)+'\n');console.log(JSON.stringify({texts:p.items.length,batch:p.firstBatch.ids.length,credits:p.firstBatch.estimatedCredits,deferred:p.deferred},null,2));}
module.exports={build,clean};
