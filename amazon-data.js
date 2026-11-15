(function(w){
  'use strict';
  const parts=w.AMAZON_DATA_PARTS;
  if(!Array.isArray(parts)||parts.length<18||parts.some((x,i)=>i<18&&typeof x!=='string')){
    console.error('Amazon v2.2 data parts are incomplete.');
    w.AMAZON_COURSE=null;
    return;
  }
  try{
    w.AMAZON_COURSE=JSON.parse(parts.slice(0,18).join('\n'));
  }catch(e){
    console.error('Amazon v2.2 data could not be parsed.',e);
    w.AMAZON_COURSE=null;
  }
  try{delete w.AMAZON_DATA_PARTS;}catch{}
})(window);
