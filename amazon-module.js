(function(w){
'use strict';
const React=w.React;if(!React)return;
const h=React.createElement,{useState,useEffect}=React;
const C={bg:'#1C1B18',soft:'#242320',marble:'#EDE6D6',dim:'#B8AF9C',bronze:'#8A6D3B',bronzeLight:'#C9A768',green:'#4A5D52',line:'#3A3730'};
const serif="Georgia, 'Times New Roman', serif",sans="-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif";
const META='staystoic_amazon_meta_v1',PROGRESS='staystoic_amazon_progress_v1',RATE='stayStoicSpeechRate';
const card={background:C.soft,border:'1px solid '+C.line,borderRadius:16,padding:'18px 16px',marginBottom:14,boxShadow:'0 12px 30px rgba(0,0,0,.18)'};
const ghost={background:'transparent',border:'1px solid '+C.line,color:C.dim,borderRadius:10,padding:'10px 14px',minHeight:42,fontSize:12,display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6,cursor:'pointer',fontFamily:sans};
const primary=bg=>({width:'100%',padding:'15px 18px',minHeight:52,background:bg||C.bronze,color:C.marble,border:'none',borderRadius:12,fontSize:15,fontFamily:sans,display:'flex',alignItems:'center',justifyContent:'center',gap:6,cursor:'pointer',marginTop:8});
function read(key,fallback){try{const v=localStorage.getItem(key);return v?JSON.parse(v):fallback}catch{return fallback}}
function write(key,v){try{localStorage.setItem(key,JSON.stringify(v))}catch(e){console.error(e)}}
function defMeta(){return{day:1,streak:0,lastCompletedDay:0,lastMarkedDay:0,completedDays:[]}}
function getRate(){try{const n=Number(localStorage.getItem(RATE));return Number.isFinite(n)&&n>=.6&&n<=1.4?n:1}catch{return 1}}
function setRate(n){n=Math.max(.6,Math.min(1.4,Number(n)||1));try{localStorage.setItem(RATE,String(n))}catch{};try{w.StoicAudio?.setRate(n)}catch{};return n}
function pct(done,total){return total?Math.round(done/total*100):0}
function Progress({value}){return h('div',{style:{height:6,background:C.bg,borderRadius:999,overflow:'hidden',marginTop:10}},h('div',{style:{width:Math.max(value?3:0,value)+'%',height:'100%',background:C.bronze,borderRadius:999}}))}
function Title({n,title,sub}){return h('div',{style:{display:'flex',alignItems:'center',gap:11,marginBottom:13}},h('div',{style:{width:32,height:32,borderRadius:'50%',border:'1px solid '+C.bronze,color:C.bronzeLight,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,flexShrink:0}},n),h('div',null,h('div',{style:{color:C.marble,fontFamily:serif,fontSize:18,lineHeight:1.15}},title),sub&&h('div',{style:{color:C.dim,fontSize:11,marginTop:3,lineHeight:1.4}},sub)))}
function Moment({day}) {
  return h(w.StayStoicMoment, { day, moduleId:'amazon' });
}
function AudioButton({text,r,status,label='🔊',accessibleLabel,lookup}){
  if(!text?.trim())return null;
  return h('button',{
    type:'button',
    'aria-label':accessibleLabel||label,
    onClick:()=>w.StoicAudio?.speak(text,r,status,lookup),
    style:{...ghost,minHeight:34,padding:'6px 9px',color:C.bronzeLight}
  },label);
}
function StudyAudio({text,label,compact=false,showEmpty=false,rate=getRate(),status}){
  const content=typeof text==='string'?text.trim():'';
  if(!content&&!showEmpty)return null;
  if(!content)return h('button',{type:'button',disabled:true,style:{...ghost,opacity:.55}},label);
  return h(AudioButton,{text:content,r:rate,status,label:compact?'🔊':'🔊 '+label,accessibleLabel:label});
}
function Home({meta,onDay,onCalendar,onVocab,onSituations}){const course=w.AMAZON_COURSE,total=course?.lessons?.length||60,lesson=course?.lessons?.[Math.max(0,Math.min(total-1,(meta.day||1)-1))],done=meta.completedDays?.length||0,p=pct(done,total);return h('div',null,h('div',{style:{display:'flex',alignItems:'center',gap:13,marginBottom:16}},h('img',{src:'seneca.webp',alt:'Séneca',style:{width:54,height:54,borderRadius:'50%',objectFit:'cover',border:'1px solid '+C.bronze}}),h('div',null,h('div',{style:{fontFamily:serif,color:C.marble,fontSize:25}},'My Way Up at Amazon'),h('div',{style:{color:C.dim,fontSize:11,marginTop:3}},'Día '+(meta.day||1)+' de '+total+' · '+p+'% completado'))),h(Progress,{value:p}),h('div',{style:{height:14}}),h(Moment,{day:meta.day||1}),h('div',{style:card},h('div',{style:{color:C.bronzeLight,fontSize:10,fontWeight:800,letterSpacing:1.1,marginBottom:7}},'LECCIÓN DE HOY'),h('div',{style:{color:C.marble,fontFamily:serif,fontSize:24,lineHeight:1.15}},lesson?.title||'Amazon Operations C1'),h('div',{style:{color:C.dim,fontSize:12,lineHeight:1.55,marginTop:8}},lesson?.objective||'C1 workplace communication practice'),lesson?.source_ids?.length&&h('div',{style:{color:C.bronzeLight,fontSize:10,marginTop:9}},'SOURCES · '+lesson.source_ids.join(' · '))),h('div',{style:{...card,padding:'0 16px'}},['Models & audio','Dialogue practice','Activities + feedback','Brief application','Review status'].map((x,i)=>h('div',{key:x,style:{padding:'13px 0',borderBottom:i<4?'1px solid '+C.line:'none',color:C.marble,fontSize:13}},(i+1)+'. '+x))),h('button',{onClick:onDay,style:primary(C.bronze)},meta.completedDays?.includes(meta.day)?'Repasar día '+meta.day:'Continuar'),h('div',{style:{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:7,marginTop:10}},h('button',{onClick:onCalendar,style:{...ghost,minWidth:0,padding:'9px 5px'}},'▦ Calendario'),h('button',{onClick:onSituations,style:{...ghost,minWidth:0,padding:'9px 5px'}},'☰ Situations'),h('button',{onClick:onVocab,style:{...ghost,minWidth:0,padding:'9px 5px'}},'Aa Vocab')))}
function Calendar({meta,onPick}){const total=w.AMAZON_COURSE?.lessons?.length||60,blocks=[];for(let s=1;s<=total;s+=10)blocks.push([s,Math.min(total,s+9)]);return h('div',null,h('div',{style:{color:C.marble,fontFamily:serif,fontSize:25,marginBottom:6}},'Calendario · My Way Up at Amazon'),h('div',{style:{color:C.dim,fontSize:12,lineHeight:1.5,marginBottom:18}},'Cada día conserva respuestas, aplicación, revisión y progreso de forma independiente.'),...blocks.map((range,bi)=>h('div',{key:bi,style:{marginBottom:18}},h('div',{style:{color:C.bronzeLight,fontSize:11,letterSpacing:.6,marginBottom:7}},'BLOQUE '+(bi+1)+' · DÍAS '+range[0]+'–'+range[1]),h('div',{style:{display:'flex',flexWrap:'wrap',gap:7}},...Array.from({length:range[1]-range[0]+1},(_,i)=>range[0]+i).map(d=>{const done=meta.completedDays?.includes(d),cur=meta.day===d;return h('button',{key:d,onClick:()=>onPick(d),style:{width:38,height:38,borderRadius:7,border:'1px solid '+(cur?C.bronzeLight:done?C.green:C.line),background:cur?C.bronze:done?C.green:C.soft,color:done||cur?C.marble:C.dim,fontSize:12,cursor:'pointer'}},d)})))))}
function Vocabulary(){const course=w.AMAZON_COURSE,[q,setQ]=useState(''),query=q.trim().toLowerCase(),all=course?.vocabulary||[];const groups=[['Priority phrases',all.filter(v=>/^V\d+$/.test(v.id))],['Warehouse vocabulary',all.filter(v=>/^W\d+$/.test(v.id))],['Maintenance vocabulary',all.filter(v=>/^TV\d+$/.test(v.id))]];const row=v=>h('div',{key:v.id,style:{padding:'10px 0',borderBottom:'1px solid '+C.line}},h('div',{style:{color:C.marble,fontSize:13,fontWeight:700}},v.term),h('div',{style:{color:C.dim,fontSize:11.5,lineHeight:1.5,marginTop:3}},v.meaning),v.status&&h('div',{style:{color:C.bronzeLight,fontSize:10,marginTop:3}},v.status),h('div',{style:{display:'flex',flexWrap:'wrap',gap:6,marginTop:7}},h(StudyAudio,{text:v.term,label:'Escuchar término'}),h(StudyAudio,{text:v.meaning,label:'Escuchar significado'})));return h('div',null,h('div',{style:{color:C.marble,fontFamily:serif,fontSize:25,marginBottom:6}},'Vocabulary & phrases'),h('div',{style:{color:C.dim,fontSize:12,lineHeight:1.5,marginBottom:14}},all.length+' términos.'),h('input',{value:q,onChange:e=>setQ(e.target.value),placeholder:'Buscar término o significado…',style:{width:'100%',background:C.soft,color:C.marble,border:'1px solid '+C.line,borderRadius:10,padding:12,fontSize:12.5,marginBottom:12,outline:'none'}}),...groups.map(([title,items],gi)=>{const filtered=items.filter(v=>!query||(v.term+' '+v.meaning+' '+(v.status||'')).toLowerCase().includes(query));return h('details',{key:title,open:gi===0,style:card},h('summary',{style:{color:C.bronzeLight,cursor:'pointer',fontWeight:800,fontSize:12}},title+' · '+filtered.length),h('div',{style:{marginTop:8}},...filtered.map(row))) }))}
function Situations({onOpenLesson}){const course=w.AMAZON_COURSE,s=course?.situations||{categories:[],entries:[]},[cat,setCat]=useState('all'),[type,setType]=useState('all'),[q,setQ]=useState(''),[selected,setSelected]=useState(null);const sourceMap=Object.fromEntries((course?.sources||[]).map(x=>[x.id,x])),lessonMap=Object.fromEntries((course?.lessons||[]).map(x=>[x.id,x])),entryMap=Object.fromEntries((s.entries||[]).map(x=>[x.id,x]));const types=[...new Set((s.entries||[]).map(x=>x.type))];const query=q.trim().toLowerCase();const filtered=(s.entries||[]).filter(x=>(cat==='all'||x.category_id===cat)&&(type==='all'||x.type===type)&&(!query||(x.title+' '+x.id+' '+x.type).toLowerCase().includes(query)));if(selected){const e=entryMap[selected],source=sourceMap[e?.source_id],fallbackLesson=e?.lesson_ids?.map(id=>lessonMap[id]).find(Boolean),narrative=source?.text||fallbackLesson?.scenario||'No narrative is available in this package.',category=s.categories.find(c=>c.id===e.category_id);return h('div',null,h('button',{onClick:()=>setSelected(null),style:{...ghost,marginBottom:14}},'‹ Situations'),h('div',{style:card},h('div',{style:{color:C.bronzeLight,fontSize:10,fontWeight:800,letterSpacing:.7,marginBottom:7}},(category?.title||e.category_id)+' · '+e.type),h('div',{style:{color:C.marble,fontFamily:serif,fontSize:24,lineHeight:1.2}},e.title),h('div',{style:{color:C.dim,fontSize:11,marginTop:7}},'ID · '+e.id+(e.technical_status?' · Technical status: '+e.technical_status:''))),h('div',{style:card},h('div',{style:{color:C.bronzeLight,fontSize:10,fontWeight:800,marginBottom:8}},'TEXT CONSULTATION'),...String(narrative).split(/\n\n+/).map((p,i)=>h('p',{key:i,style:{color:C.dim,fontSize:12.5,lineHeight:1.65,margin:'0 0 10px'}},p)),h('div',{style:{color:C.dim,fontSize:10.5,lineHeight:1.45,marginTop:12,borderTop:'1px solid '+C.line,paddingTop:10}},'Abre una lección vinculada para escuchar este mismo texto.')),e.related_situation_ids?.length?h('div',{style:card},h('div',{style:{color:C.bronzeLight,fontSize:10,fontWeight:800,marginBottom:8}},'RELATED SITUATIONS'),...e.related_situation_ids.map(id=>{const r=entryMap[id];return h('button',{key:id,onClick:()=>setSelected(id),style:{...ghost,width:'100%',marginBottom:7,justifyContent:'flex-start'}},r?r.title:id)})):null,e.lesson_ids?.length?h('div',{style:card},h('div',{style:{color:C.bronzeLight,fontSize:10,fontWeight:800,marginBottom:8}},'LINKED LESSONS'),...e.lesson_ids.map(id=>{const l=lessonMap[id];return h('button',{key:id,onClick:()=>l&&onOpenLesson(id,{title:e.title,text:narrative}),style:{...ghost,width:'100%',marginBottom:7,justifyContent:'flex-start'}},l?'Día '+l.day+' · Escuchar en la lección':id)})):null)}return h('div',null,h('div',{style:{color:C.marble,fontFamily:serif,fontSize:25,marginBottom:6}},s.title||'Situations'),h('div',{style:{color:C.dim,fontSize:12,lineHeight:1.5,marginBottom:14}},(s.entries?.length||0)+' situaciones para consulta. Abrir una situación no cambia el progreso de las lecciones.'),h('input',{value:q,onChange:e=>setQ(e.target.value),placeholder:'Buscar situación…',style:{width:'100%',background:C.soft,color:C.marble,border:'1px solid '+C.line,borderRadius:10,padding:12,fontSize:12.5,marginBottom:9,outline:'none'}}),h('select',{value:cat,onChange:e=>setCat(e.target.value),style:{width:'100%',background:C.soft,color:C.marble,border:'1px solid '+C.line,borderRadius:10,padding:11,fontSize:12,marginBottom:9}},h('option',{value:'all'},'Todas las categorías'),...s.categories.map(c=>h('option',{key:c.id,value:c.id},c.title))),h('select',{value:type,onChange:e=>setType(e.target.value),style:{width:'100%',background:C.soft,color:C.marble,border:'1px solid '+C.line,borderRadius:10,padding:11,fontSize:12,marginBottom:14}},h('option',{value:'all'},'Todos los tipos'),...types.map(t=>h('option',{key:t,value:t},t))),...filtered.map(e=>h('button',{key:e.id,onClick:()=>setSelected(e.id),style:{...card,width:'100%',textAlign:'left',cursor:'pointer'}},h('div',{style:{color:C.bronzeLight,fontSize:9.5,fontWeight:800,letterSpacing:.5}},e.type+' · '+e.id),h('div',{style:{color:C.marble,fontFamily:serif,fontSize:17,lineHeight:1.3,marginTop:5}},e.title),e.technical_status&&h('div',{style:{color:C.dim,fontSize:10.5,marginTop:6}},'Technical status · '+e.technical_status))))}
function Activity({a,record,onChange,listenText,r,status}){
  const checked=!!record?.checked;
  const isOrder=a.type==='order';
  const order=isOrder?(record?.order?.length?record.order:a.cards||[]):[];
  const correctOrder=a.correct_order||[];
  const correct=isOrder?JSON.stringify(order)===JSON.stringify(correctOrder):record?.selected===a.correct_index;
  const play=(text,label,compact=false)=>h(StudyAudio,{text,label,compact,rate:r,status});
  const row=(text,controls,key)=>h('div',{className:'study-audio-row',key},
    h('div',{style:{fontSize:12,lineHeight:1.5}},text),...controls);
  function move(index,direction){
    const next=index+direction;
    if(next<0||next>=order.length)return;
    const updated=[...order];
    [updated[index],updated[next]]=[updated[next],updated[index]];
    onChange({order:updated,checked:false});
  }
  return h('div',{style:{...card,padding:14}},
    h('div',{style:{color:C.bronzeLight,fontSize:10,fontWeight:800,marginBottom:7}},'ACTIVIDAD'),
    row(a.prompt,[play(a.prompt,'Escuchar pregunta',true)]),
    a.type==='listen_select'&&h('div',{style:{margin:'8px 0 10px'}},play(listenText,'Escuchar situación')),
    isOrder?h(React.Fragment,null,
      ...order.map((text,index)=>row((index+1)+'. '+text,[
        play(text,'Escuchar tarjeta '+(index+1),true),
        h('button',{type:'button',onClick:()=>move(index,-1),disabled:index===0,style:{...ghost,minHeight:34,padding:'4px 7px'},'aria-label':'Subir tarjeta '+(index+1)},'↑'),
        h('button',{type:'button',onClick:()=>move(index,1),disabled:index===order.length-1,style:{...ghost,minHeight:34,padding:'4px 7px'},'aria-label':'Bajar tarjeta '+(index+1)},'↓')
      ],text)),
      play(order.join('. '),'Escuchar mi orden'),
      h('button',{type:'button',onClick:()=>onChange({order,checked:true}),style:{...ghost,width:'100%',marginTop:8}},'Comprobar orden')
    ):h(React.Fragment,null,...(a.options||[]).map((text,index)=>{
      const letter=String.fromCharCode(65+index);
      const right=checked&&index===a.correct_index;
      const selected=index===record?.selected;
      return h('div',{className:'study-audio-row',key:index},
        h('button',{
          type:'button',onClick:()=>onChange({selected:index,checked:true}),
          style:{...ghost,display:'block',textAlign:'left',lineHeight:1.45,
            background:right?'rgba(74,93,82,.35)':selected?'rgba(138,109,59,.25)':C.bg,
            borderColor:right?C.green:selected?C.bronzeLight:C.line}
        },letter+'. '+text),
        play(text,'Escuchar opción '+letter,true)
      );
    })),
    checked&&h('div',{style:{marginTop:10,color:correct?'#9FC9A8':C.bronzeLight,fontSize:11.5,lineHeight:1.5}},
      correct?'✓ Correcto. ':isOrder?'Revisa el orden. ':'Respuesta: '+String.fromCharCode(65+a.correct_index)+'. ',
      a.feedback,
      isOrder&&!correct&&h('div',null,'Orden: '+correctOrder.join(' → ')),
      h('div',{style:{display:'flex',flexWrap:'wrap',gap:6,marginTop:8}},
        play(isOrder?correctOrder.join('. '):a.options?.[a.correct_index],'Escuchar respuesta correcta'),
        play(a.feedback,'Escuchar explicación')
      )
    )
  );
}
function Lesson({lesson,meta,record,onPatch,onComplete,reference}){
  const [r,setR]=useState(getRate());
  const [status,setStatus]=useState('');
  const done=meta.completedDays?.includes(lesson.day);
  const answers=record?.answers||{};
  const application=record?.application||'';
  const review=record?.reviewStatus||'';
  const saveAnswer=(n,v)=>onPatch({answers:{...answers,[n]:v}});
  const pieces=[];
  const readText=(text,label,showEmpty=false)=>h(StudyAudio,{
    text,label,showEmpty,rate:r,status:setStatus
  });

  pieces.push(
    h('div',{key:'eyebrow',style:{color:C.bronzeLight,fontSize:10.5,fontWeight:800,letterSpacing:1.1,marginBottom:6}},'DÍA '+lesson.day+' · '+lesson.id),
    h('div',{key:'title',style:{color:C.marble,fontFamily:serif,fontSize:29,lineHeight:1.12,marginBottom:6}},lesson.title),
    h('div',{key:'objective',style:{color:C.dim,fontSize:12,lineHeight:1.55,marginBottom:16}},lesson.objective, h('div',{style:{marginTop:8}},readText(lesson.objective,'Escuchar objetivo'))),
    h(Moment,{key:'moment',day:lesson.day})
  );

  const referenceText=reference?.text;
  const repeatsScenario=referenceText===lesson.scenario;

  function narrativeCard(key,title,text,label,n,subtitle){
    return h('section',{key,style:card,'aria-label':title},
      h(Title,{n,title,sub:subtitle}),
      ...text.split(/\n\n+/).map((paragraph,i)=>h('p',{
        key:i,style:{color:C.marble,fontFamily:serif,fontSize:14,lineHeight:1.65,margin:'0 0 10px',whiteSpace:'pre-line'}
      },paragraph)),
      h(AudioButton,{text,r,status:setStatus,label:'🔊 '+label})
    );
  }

  if(referenceText&&!repeatsScenario){
    pieces.push(narrativeCard('reference',reference.title,referenceText,'Escuchar texto de Situations','↳','Texto de Situations'));
  }
  pieces.push(narrativeCard('situation','Situation & communication goal',lesson.scenario,
    repeatsScenario?'Escuchar texto de Situations':'Escuchar situación','1','Observed issue, evidence, boundary and operational update.'));

  const audioKey=(kind,i,j)=>`amazon-audio:${lesson.id}:${kind}:${i}`+(j===undefined?'':':'+j);
  const modelChildren=[
    h(Title,{key:'t',n:'2',title:'Models · listen & repeat'})
  ];
  (lesson.models||[]).forEach((text,i)=>{
    modelChildren.push(h('div',{key:'m'+i,style:{display:'flex',gap:9,alignItems:'flex-start',padding:'10px 0',borderBottom:i<lesson.models.length-1?'1px solid '+C.line:'none'}},
      h('div',{style:{flex:1,color:C.marble,fontFamily:serif,fontSize:13.5,lineHeight:1.55}},(i+1)+'. '+text),
      h(AudioButton,{text,lookup:audioKey('model',i),r,status:setStatus,accessibleLabel:'Escuchar modelo '+(i+1)})
    ));
  });
  pieces.push(h('div',{key:'models',style:card},...modelChildren));

  const variants=lesson.dialogue_variants||[];
  const dialogueChildren=[
    h(Title,{key:'t',n:'3',title:'Dialogue practice'})
  ];
  variants.forEach((variant,vi)=>{
    const lineChildren=[];
    variant.forEach((line,li)=>{
      lineChildren.push(h('div',{key:'l'+li,style:{display:'flex',gap:8,alignItems:'flex-start',padding:'5px 0'}},
        h('div',{style:{flex:1,color:C.dim,fontSize:11.5,lineHeight:1.55}},
          h('strong',{style:{color:C.marble}},line.speaker+': '),line.text
        ),
        h(AudioButton,{text:line.text,lookup:audioKey('dialogue',vi,li),r,status:setStatus,accessibleLabel:'Escuchar a '+line.speaker+' · línea '+(li+1)})
      ));
    });
    dialogueChildren.push(h('details',{key:'d'+vi,style:{padding:'9px 0',borderBottom:vi<variants.length-1?'1px solid '+C.line:'none'}},
      h('summary',{style:{color:C.marble,cursor:'pointer',fontSize:12,fontWeight:700}},'Dialogue '+(vi+1)),
      h('div',{style:{marginTop:8}},...lineChildren)
    ));
  });
  pieces.push(h('div',{key:'dialogues',style:card},...dialogueChildren));

  const activityChildren=[
    h(Title,{key:'t',n:'4',title:'Selection & analysis',sub:'La respuesta se revela después de tu intento.'})
  ];
  (lesson.activities||[]).forEach((a,i)=>{
    activityChildren.push(h(Activity,{key:'a'+i,a,record:answers[i],onChange:v=>saveAnswer(i,v),listenText:lesson.scenario,r,status:setStatus}));
  });
  pieces.push(h('div',{key:'activities'},...activityChildren));

  pieces.push(h('div',{key:'application',style:card},
    h(Title,{n:'5',title:'Brief application',sub:'Una respuesta corta, escrita o hablada.'}),
    h('div',{style:{color:C.marble,fontSize:12.5,lineHeight:1.6,marginBottom:10}},lesson.short_application?.prompt, h('div',{style:{marginTop:8}},readText(lesson.short_application?.prompt,'Escuchar consigna'))),
    h('textarea',{
      value:application,
      onChange:e=>onPatch({application:e.target.value}),
      placeholder:'Write your brief operational update here…',
      style:{width:'100%',minHeight:105,resize:'vertical',background:C.bg,color:C.marble,border:'1px solid '+C.line,borderRadius:10,padding:11,fontSize:12.5,lineHeight:1.5,outline:'none'}
    }),
    h('div',{style:{marginTop:8}},readText(application,'Escuchar mi respuesta',true)),
    h('details',{style:{marginTop:10}},
      h('summary',{style:{color:C.bronzeLight,cursor:'pointer',fontSize:11.5}},'Ver model response'),
      h('div',{style:{color:C.dim,fontSize:11.5,lineHeight:1.55,marginTop:8}},lesson.short_application?.model, h('div',{style:{marginTop:8}},readText(lesson.short_application?.model,'Escuchar respuesta modelo')))
    )
  ));

  const aliases={correction:'suggest_correction',exclude:'exclude_from_practice',pending_detail:'mark_pending'};
  const normalizedReview=aliases[review]||review;
  const reviewButtons=[];
  [['accept','✓ Aceptar'],['suggest_correction','✎ Corregir'],['exclude_from_practice','× Excluir'],['mark_pending','⏳ Pendiente']].forEach(([v,label])=>{
    reviewButtons.push(h('button',{
      key:v,
      onClick:()=>onPatch({reviewStatus:v}),
      style:{...ghost,minWidth:0,color:normalizedReview===v?C.marble:C.dim,background:normalizedReview===v?C.bronze:'transparent',borderColor:normalizedReview===v?C.bronzeLight:C.line}
    },label));
  });
  pieces.push(h('div',{key:'review',style:card},
    h(Title,{n:'6',title:'Review status',sub:'Mantén la fuente, sugiere corrección, excluye de práctica o marca pendiente.'}),
    h('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}},...reviewButtons)
  ));

  const speedButtons=[.75,.8,1,1.15].map(n=>h('button',{
    key:n,
    onClick:()=>setR(setRate(n)),
    style:{...ghost,minWidth:0,padding:'8px 4px',color:Math.abs(r-n)<.001?C.marble:C.dim,background:Math.abs(r-n)<.001?C.bronze:'transparent',borderColor:Math.abs(r-n)<.001?C.bronzeLight:C.line}
  },n+'×'));
  pieces.push(h('div',{key:'audio',style:card},
    h(Title,{n:'7',title:'Audio playback',sub:'Grabación disponible o voz nativa en inglés.'}),
    h('div',{style:{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:7}},...speedButtons),
    h('button',{type:'button',style:{...ghost,marginTop:10},onClick:()=>{w.StoicAudio?.stop();setStatus('Audio detenido.')}},'Detener audio'),
    status?h('div',{role:'status',style:{color:C.dim,fontSize:10.5,marginTop:8}},status):null
  ));

  pieces.push(h('button',{
    key:'complete',
    onClick:onComplete,
    disabled:done,
    style:{...primary(done?C.green:C.bronze),opacity:done ? .8 : 1,cursor:done?'default':'pointer',marginBottom:30}
  },done?'✓ Día completado':'✓ Guardar día '+lesson.day+' como hecho'));

  return h('div',null,...pieces);
}
function AmazonApp(){const course=w.AMAZON_COURSE,[meta,setMeta]=useState(()=>read(META,defMeta())),[progress,setProgress]=useState(()=>read(PROGRESS,{})),[view,setView]=useState('home'),[activeDay,setActiveDay]=useState(meta.day||1),[reference,setReference]=useState(null);useEffect(()=>{try{w.StoicAudio?.stop?.()}catch{}w.resetStayStoicScroll()},[view,activeDay]);if(!course?.lessons?.length)return h('div',{style:{minHeight:'100vh',background:C.bg,color:C.marble,padding:24,fontFamily:sans}},'No se pudo cargar My Way Up at Amazon.');const total=course.lessons.length,lesson=course.lessons[Math.max(0,Math.min(total-1,activeDay-1))],record=progress[lesson?.id]||{};const saveMeta=n=>{setMeta(n);write(META,n)},saveProgress=n=>{setProgress(n);write(PROGRESS,n)},open=(d,source=null)=>{setReference(source);setActiveDay(Math.max(1,Math.min(total,d)));setView('day')},openId=(id,source)=>{const l=course.lessons.find(x=>x.id===id);if(l)open(l.day,source)},patch=p=>{const n={...progress,[lesson.id]:{...(progress[lesson.id]||{}),...p,lessonId:lesson.id,updatedAt:Date.now()}};saveProgress(n)},complete=()=>{if(meta.completedDays?.includes(activeDay))return;const completedDays=[...(meta.completedDays||[]),activeDay].sort((a,b)=>a-b),seq=activeDay===meta.day,nextDay=seq?Math.min(total,activeDay+1):meta.day,streak=seq?(meta.lastCompletedDay===activeDay-1||activeDay===1?(meta.streak||0)+1:1):meta.streak||0;saveMeta({...meta,day:nextDay,lastMarkedDay:activeDay,lastCompletedDay:Math.max(meta.lastCompletedDay||0,activeDay),streak,completedDays});setView('home')};return h('div',{style:{minHeight:'100vh',background:C.bg,color:C.marble,fontFamily:sans}},h('div',{style:{maxWidth:520,margin:'0 auto',padding:'22px 18px 42px'}},view==='home'&&h(Home,{meta,onDay:()=>open(meta.day||1),onCalendar:()=>setView('calendar'),onVocab:()=>setView('vocabulary'),onSituations:()=>setView('situations')}),view==='calendar'&&h(React.Fragment,null,h('button',{onClick:()=>setView('home'),style:{...ghost,marginBottom:16}},'‹ Inicio Amazon'),h(Calendar,{meta,onPick:open})),view==='vocabulary'&&h(React.Fragment,null,h('button',{onClick:()=>setView('home'),style:{...ghost,marginBottom:16}},'‹ Inicio Amazon'),h(Vocabulary)),view==='situations'&&h(React.Fragment,null,h('button',{onClick:()=>setView('home'),style:{...ghost,marginBottom:16}},'‹ Inicio Amazon'),h(Situations,{onOpenLesson:openId})),view==='day'&&h(React.Fragment,null,h('button',{onClick:()=>setView('home'),style:{...ghost,marginBottom:16}},'‹ Inicio Amazon'),h(Lesson,{key:lesson.id,lesson,meta,record,onPatch:patch,onComplete:complete,reference}))))}
w.StayStoicAmazonApp=AmazonApp;
})(window);
