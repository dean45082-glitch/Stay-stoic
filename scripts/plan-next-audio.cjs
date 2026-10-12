'use strict';
// Planning only: never reads credentials or contacts ElevenLabs.
const fs=require('node:fs'),path=require('node:path');
const manifest=require('../audio-plan/manifest.json');
const store=path.resolve(process.argv[2]||'audio-store');
const budget=Number(process.argv[3]||9800);
if(!Number.isSafeInteger(budget)||budget<1||budget>9800)throw Error('Budget must be 1..9800 credits');
const ledger=JSON.parse(fs.readFileSync(path.join(store,'ledger.json'),'utf8'));
const unresolved=Object.entries(ledger.entries).filter(([,r])=>r.status!=='complete');
if(unresolved.length)throw Error('Reconcile unresolved requests before planning another batch');
const pending=manifest.items.filter(i=>ledger.entries[i.id]?.status!=='complete');
const ids=[];let credits=0;for(const item of pending){if(credits+item.credits>budget)break;ids.push(item.id);credits+=item.credits;}
console.log(JSON.stringify({planningOnly:true,voiceId:manifest.profile.voiceId,budget,estimatedCredits:credits,files:ids.length,remainingAfterBatch:pending.length-ids.length,ids},null,2));
