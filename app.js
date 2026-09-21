const FLAT_BANK = WEEKS.flatMap(w => w.pool.map((pair, i) => ({
  id: `w${w.id}_${i}`,
  weekId: w.id,
  tag: w.title,
  bridge: w.bridge,
  priority: w.priority,
  es: pair[0],
  en: pair[1]
})));

/* ===================== STORAGE ===================== */
async function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
async function saveJSON(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error(e);
  }
}
const SPEECH_RATE_KEY = "stayStoicSpeechRate";
function getSpeechRate() {
  try {
    const n = Number(localStorage.getItem(SPEECH_RATE_KEY));
    return Number.isFinite(n) && n >= 0.6 && n <= 1.4 ? n : 0.9;
  } catch {
    return 0.9;
  }
}
function setSpeechRate(rate) {
  const n = Math.max(0.6, Math.min(1.4, Number(rate) || 0.9));
  try { localStorage.setItem(SPEECH_RATE_KEY, String(n)); } catch {}
  try {
    if (window.AndroidTTS && typeof window.AndroidTTS.setSpeechRate === "function") {
      window.AndroidTTS.setSpeechRate(n);
    }
  } catch (e) {
    console.error("setSpeechRate error", e);
  }
  return n;
}
function defaultMeta() {
  return {
    day: 1,
    streak: 0,
    lastCompletedDay: 0,
    bridgeErrors: {
      be: 0,
      have: 0,
      been: 0,
      modal: 0
    },
    examHistory: [],
    examUsedIds: [],
    completedDays: []
  };
}

/* Audio: se llama de forma sincrona para no perder el gesto del usuario.
   speakWithStatus() además reporta qué pasó, para poder diagnosticar. */
function speak(text) {
  try {
    const rate = getSpeechRate();
    if (window.AndroidTTS && typeof window.AndroidTTS.speak === "function") {
      if (typeof window.AndroidTTS.setSpeechRate === "function") window.AndroidTTS.setSpeechRate(rate);
      window.AndroidTTS.speak(text);
      return;
    }
    if (!window.speechSynthesis) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = rate;
    synth.speak(u);
    if (synth.paused) synth.resume();
  } catch (e) {
    console.error("speak error", e);
  }
}
function speakWithStatus(text, setStatus) {
  try {
    const rate = getSpeechRate();
    if (window.AndroidTTS && typeof window.AndroidTTS.speak === "function") {
      if (typeof window.AndroidTTS.setSpeechRate === "function") window.AndroidTTS.setSpeechRate(rate);
      window.AndroidTTS.speak(text);
      setStatus("✅ Audio nativo de Android activo.");
      return;
    }
    if (!window.speechSynthesis) {
      setStatus("❌ Audio no disponible en este dispositivo.");
      return;
    }
    const synth = window.speechSynthesis;
    synth.cancel();
    const voices = synth.getVoices();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = rate;
    u.onstart = () => setStatus("🔊 Reproduciendo... (voces disponibles: " + voices.length + ")");
    u.onend = () => setStatus("✅ Terminó sin errores.");
    u.onerror = e => setStatus("❌ Error al reproducir: " + (e.error || "desconocido"));
    synth.speak(u);
    if (synth.paused) synth.resume();
    setTimeout(() => {
      if (synth.speaking === false && synth.pending === false) {
        setStatus(s => s.startsWith("🔊") ? "⚠️ No se detectó audio real (puede que el entorno bloquee el sonido). Voces: " + voices.length : s);
      }
    }, 800);
  } catch (e) {
    setStatus("❌ Excepción: " + e.message);
  }
}
function normalizeAnswer(s) {
  return s.toLowerCase().replace(/[.,!?¡¿"']/g, "").replace(/\s+/g, " ").trim();
}

/* ===================== HELPERS DE CONTENIDO ===================== */

const MODAL_DAILY_STRUCTURES = {
  11: [
    ["Yo lo habría hecho distinto.","I would've done it differently."],
    ["Lo habría hecho distinto si pudiera volver atrás.","I'd've done it differently if I could go back."],
    ["Preferiría luchar por la paz que quedarme callado.","I'd rather fight for peace than stay silent."],
    ["En retrospectiva, no habría contenido lo que pensaba.","In hindsight, I wouldn't have held back what I thought."],
    ["Ojalá hubiera dejado ir ese resentimiento antes.","If only I'd let go of that resentment sooner."],
    ["Habría reaccionado distinto si hubiera tenido más perspectiva.","I would've reacted differently if I'd had more perspective."],
    ["Ella habría preferido esperar que actuar por impulso.","She would've rather waited than acted on impulse."],
    ["Nosotros no habríamos contenido la verdad por tanto tiempo.","We wouldn't have held back the truth for so long."],
    ["En retrospectiva, ellos habrían tomado otra decisión.","In hindsight, they would've made a different decision."],
    ["Yo habría dejado ir la discusión mucho antes.","I would've let the argument go much sooner."],
    ["Él habría hablado distinto si hubiera sabido el resultado.","He would've spoken differently if he'd known the outcome."],
    ["Ojalá no hubiéramos esperado hasta el último momento.","If only we hadn't waited until the last moment."],
    ["Habría preferido perder la discusión que perder la calma.","I'd rather have lost the argument than lost my calm."],
    ["Ella no habría contenido su opinión si se hubiera sentido segura.","She wouldn't have held back her opinion if she'd felt safe."],
    ["En retrospectiva, yo habría sido más paciente.","In hindsight, I would've been more patient."],
    ["Ellos habrían hecho las paces si hubieran dejado ir el orgullo.","They would've made peace if they'd let go of their pride."],
    ["Ojalá hubiera manejado esa conversación de otra manera.","If only I'd handled that conversation differently."],
    ["Habríamos elegido otra ruta si hubiéramos visto el riesgo.","We would've chosen another path if we'd seen the risk."]
  ],
  12: [
    ["Eso debió haber sido duro.","That must've been rough."],
    ["Debo haber parecido más molesto de lo que pensaba.","I must've looked more upset than I thought."],
    ["Debes aceptar lo que ya pasó.","You must come to grips with what already happened."],
    ["Ella debe haber asumido que no íbamos a llegar.","She must've assumed we weren't going to make it."],
    ["Ese resultado debió haber parecido inevitable.","That outcome must've seemed inevitable."],
    ["Su reacción debe haber venido de una deducción equivocada.","His reaction must've come from a wrong deduction."],
    ["Ellos deben haber llegado a aceptar la situación anoche.","They must've come to grips with the situation last night."],
    ["Debimos haber confundido certeza con una simple suposición.","We must've mistaken certainty for a simple assumption."],
    ["Él debe haber pensado que la decisión era inevitable.","He must've thought the decision was inevitable."],
    ["Algo debe haber cambiado después de esa conversación.","Something must've changed after that conversation."],
    ["Ella debe haber sacado esa conclusión por lo que vio.","She must've made that deduction from what she saw."],
    ["Debes haber asumido demasiado sin suficiente evidencia.","You must've assumed too much without enough evidence."],
    ["Ellos deben haber sentido mucha certeza en ese momento.","They must've felt very certain at that moment."],
    ["Debimos haber entendido mal la señal.","We must've misunderstood the signal."],
    ["Eso debe haberles ayudado a aceptar la realidad.","That must've helped them come to grips with reality."],
    ["Él debe haber visto el cambio como algo inevitable.","He must've seen the change as inevitable."],
    ["Ella debe haber supuesto que ya lo sabíamos.","She must've assumed we already knew."],
    ["Nuestra deducción debe haber sido incompleta.","Our deduction must've been incomplete."]
  ],
  13: [
    ["Debería haber podido resolverlo solo.","I should've been able to figure it out alone."],
    ["No debiste haberte molestado por eso.","You shouldn't have gotten upset about that."],
    ["Ella debería poder demostrar lo que vale pronto.","She should be able to prove herself soon."],
    ["Debería haber podido ganarme mi lugar sin apresurarme.","I should've been able to earn my place without rushing."],
    ["Él debería haber podido manejar mejor la curva de aprendizaje.","He should've been able to handle the learning curve better."],
    ["Deberíamos haber podido avanzar paso a paso.","We should've been able to work our way up step by step."],
    ["Ella debería haber podido demostrar lo que valía bajo presión.","She should've been able to prove herself under pressure."],
    ["No deberías haber esperado dominarlo de inmediato.","You shouldn't have expected to master it immediately."],
    ["Ellos deberían haber podido pagar su derecho de piso con paciencia.","They should've been able to pay their dues with patience."],
    ["Yo debería haber podido aprender de ese error antes.","I should've been able to learn from that mistake sooner."],
    ["Él debería haber podido ganarse la confianza del equipo.","He should've been able to earn the team's trust."],
    ["Nosotros deberíamos haber podido superar esa curva de aprendizaje.","We should've been able to get through that learning curve."],
    ["Ella no debería haber dudado tanto de sí misma.","She shouldn't have doubted herself so much."],
    ["Deberías haber podido demostrar tu progreso con hechos.","You should've been able to prove your progress through actions."],
    ["Ellos deberían haber podido avanzar sin saltarse etapas.","They should've been able to work their way up without skipping steps."],
    ["Yo no debería haber esperado resultados instantáneos.","I shouldn't have expected instant results."],
    ["Él debería haber podido demostrar que se había ganado su lugar.","He should've been able to prove he'd earned his place."],
    ["Deberíamos haber podido ver esa dificultad como parte del proceso.","We should've been able to see that difficulty as part of the process."]
  ],
  14: [
    ["Deberías haberlo sabido mejor.","You ought to have known better."],
    ["Ella debería haber asumido esa responsabilidad.","She ought to have taken that responsibility."],
    ["Deberíamos haber cumplido con esa obligación formal.","We ought to have met that formal obligation."],
    ["En retrospectiva, yo debería haber hablado antes.","In hindsight, I ought to have spoken sooner."],
    ["Ellos deberían haber aclarado la expectativa desde el principio.","They ought to have clarified the expectation from the start."],
    ["Él debería haber sabido que eso tendría consecuencias.","He ought to have known that would have consequences."],
    ["Yo debería haber asumido más responsabilidad por el resultado.","I ought to have taken more responsibility for the outcome."],
    ["Ella debería haber manejado esa obligación con más cuidado.","She ought to have handled that obligation more carefully."],
    ["En retrospectiva, deberíamos haber preguntado antes de asumir.","In hindsight, we ought to have asked before assuming."],
    ["Ellos deberían haber sabido mejor que ignorar esa señal.","They ought to have known better than to ignore that sign."],
    ["Tú deberías haber dejado clara tu expectativa.","You ought to have made your expectation clear."],
    ["Yo debería haber cumplido lo que prometí.","I ought to have followed through on what I promised."],
    ["Ella debería haber aceptado su parte de responsabilidad.","She ought to have accepted her share of the responsibility."],
    ["Nosotros deberíamos haber tratado esa obligación como prioritaria.","We ought to have treated that obligation as a priority."],
    ["En retrospectiva, él debería haber sido más directo.","In hindsight, he ought to have been more direct."],
    ["Ellos deberían haber sabido mejor que depender de una suposición.","They ought to have known better than to rely on an assumption."],
    ["Deberías haber ajustado tu expectativa a la realidad.","You ought to have adjusted your expectation to reality."],
    ["Yo debería haber respondido con más responsabilidad.","I ought to have responded with more responsibility."]
  ]
};


const DEEP_READING_WEEK1 = [
  [
    "Tomorrow I'll be enduring another demanding day, but I won't be wasting energy on what I can't control.",
    "I'll be bracing myself for setbacks instead of pretending they won't happen.",
    "By the end of the day, I'll be letting go of whatever no longer deserves my attention."
  ],
  [
    "This week I'll be building resilience by staying consistent when things get uncomfortable.",
    "I won't be letting one setback decide how the rest of the week goes.",
    "I'll be learning to endure pressure without turning it into panic."
  ],
  [
    "She'll be bracing herself for a difficult conversation, but she'll be staying calm.",
    "She'll be letting go of the need to control the other person's reaction.",
    "That kind of response will be strengthening her resilience over time."
  ],
  [
    "We'll be facing uncertainty, but we won't be treating it like an emergency.",
    "We'll be enduring the discomfort long enough to think clearly.",
    "Afterward, we'll be letting go of the parts we can no longer change."
  ],
  [
    "He'll be dealing with another setback tomorrow, but he won't be quitting.",
    "He'll be rebuilding his resilience one decision at a time.",
    "By next week, he'll be bracing himself for challenges with more confidence."
  ],
  [
    "They'll be facing the same pressure from a different perspective.",
    "They'll be enduring what they cannot avoid and changing what they can.",
    "They'll be letting go of the rest instead of carrying it forward."
  ],
  [
    "Next week I'll be putting everything together in a more deliberate way.",
    "I'll be bracing myself for difficult moments without expecting perfection.",
    "I'll be using every setback as another chance to build resilience."
  ]
];

function deepReadingForDay(day, week, structureModel) {
  const offset = Math.max(0, day - week.range[0]);
  if (week.id === 1) return DEEP_READING_WEEK1[offset % DEEP_READING_WEEK1.length];

  const modalBank = MODAL_DAILY_STRUCTURES[week.id];
  if (modalBank && modalBank.length) {
    const start = ((offset * 3) + 6) % modalBank.length;
    const out = [];
    for (let i = 0; i < 3; i++) out.push(modalBank[(start + i) % modalBank.length][1]);
    return out;
  }

  const candidates = [
    ...(week.pool || []).map(x => x[1]),
    ...(week.structures || []),
    ...(week.ancla ? [week.ancla] : [])
  ].filter(Boolean);

  const seen = new Set((structureModel || []).map(x => x.en));
  const unique = candidates.filter(x => !seen.has(x));
  const source = unique.length >= 3 ? unique : candidates;
  const start = source.length ? (offset * 3) % source.length : 0;
  const out = [];
  for (let i = 0; i < Math.min(3, source.length); i++) out.push(source[(start + i) % source.length]);
  return out;
}

function weekForDay(day) {
  return WEEKS.find(w => day >= w.range[0] && day <= w.range[1]) || WEEKS[WEEKS.length - 1];
}
function isExamDay(day) {
  return day % 7 === 0;
}

// Rota los 8 items del pool semanal entre 4 usos distintos (reorder / mc / pairs / translate)
// segun el dia, para que ningun dia use la misma combinacion que otro dentro de la semana.
function weekSlotsForDay(day, week) {
  const pool = week.pool.map((pair, i) => ({
    id: `w${week.id}_${i}`,
    weekId: week.id,
    tag: week.title,
    bridge: week.bridge,
    priority: week.priority,
    es: pair[0],
    en: pair[1]
  }));
  const rot = day % 8;
  const order = pool.map((_, i) => pool[(i + rot) % 8]);
  // Estructura modelo: 21 frases distintas por semana (banco propio, structBank),
  // 3 por dia, sin repetir el mismo trio ni la misma frase en toda la semana.
  const dayOffset = (day - week.range[0]) % 7;
  const structureSource = MODAL_DAILY_STRUCTURES[week.id] || week.structBank;
  const structureModel = structureSource.slice(dayOffset * 3, dayOffset * 3 + 3).map(pair => ({
    es: pair[0],
    en: pair[1]
  }));
  return {
    reorder: order.slice(0, 2),
    mcGram: order.slice(2, 4),
    pairsGram: order.slice(4, 6),
    translateGram: order.slice(6, 8),
    structureModel
  };
}

// Distribuye 12 piezas del banco extra por dia (4 lectura + 2 fillblank + 2 mc + 2 pairs + 2 translate),
// rotando por dia sin repetir hasta agotar las 542.
function extraSlotsForDay(day) {
  const n = 12;
  const start = (day - 1) * n % EXTRA_BANK.length;
  const items = [];
  for (let i = 0; i < n; i++) items.push(EXTRA_BANK[(start + i) % EXTRA_BANK.length]);
  return {
    read: items.slice(0, 4),
    fillblank: items.slice(4, 6),
    mc: items.slice(6, 8),
    pairs: items.slice(8, 10),
    translate: items.slice(10, 12)
  };
}
function buildReorder(item) {
  const words = item.en.replace(/[.,!?]/g, "").split(" ");
  const shuffled = [...words].sort(() => Math.random() - 0.5);
  return {
    words,
    shuffled
  };
}
function makeDistractors(correctItem, pool, n = 3) {
  const others = pool.filter(i => i.en !== correctItem.en);
  const src = others.length >= n ? others : FLAT_BANK.filter(i => i.en !== correctItem.en);
  return [...src].sort(() => Math.random() - 0.5).slice(0, n).map(i => i.en);
}
function buildOptions(item, pool) {
  const distractors = makeDistractors(item, pool, 3);
  return [...distractors, item.en].sort(() => Math.random() - 0.5);
}

// Genera un blank generico dentro de una frase del banco extra (sin depender de espanol):
// elige una palabra de contenido (>=4 letras) y la reemplaza por ___
function genericBlank(phrase, wordPoolSource) {
  const words = phrase.replace(/[.,!?]/g, "").split(" ");
  const candidates = words.map((w, i) => ({
    w,
    i
  })).filter(x => x.w.length >= 4);
  if (candidates.length === 0) return null;
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  const blanked = words.map((w, i) => i === pick.i ? "___" : w).join(" ");
  const otherWords = wordPoolSource.flatMap(p => p.phrase.replace(/[.,!?]/g, "").split(" ")).filter(w => w.length >= 4 && w.toLowerCase() !== pick.w.toLowerCase());
  const distractors = [...new Set(otherWords)].sort(() => Math.random() - 0.5).slice(0, 2);
  const options = [pick.w, ...distractors].sort(() => Math.random() - 0.5);
  return {
    blanked,
    correct: pick.w,
    options
  };
}

// Variante "escrita" del blank de arriba: sin opciones, hay que escribir la palabra
function genericBlankTyped(phrase) {
  const words = phrase.replace(/[.,!?]/g, "").split(" ");
  const candidates = words.map((w, i) => ({
    w,
    i
  })).filter(x => x.w.length >= 4);
  if (candidates.length === 0) return null;
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  const blanked = words.map((w, i) => i === pick.i ? "___" : w).join(" ");
  return {
    blanked,
    correct: pick.w
  };
}

// Arma 3 variantes "casi correctas" de una frase del banco extra (una palabra cambiada)
// para el ejercicio de opcion multiple "elige la frase correctamente escrita"
function buildPhraseVariants(phrase, wordPoolSource) {
  const words = phrase.replace(/[.,!?]/g, "").split(" ");
  const otherWords = wordPoolSource.flatMap(p => p.phrase.replace(/[.,!?]/g, "").split(" ")).filter(w => w.length >= 3);
  const variants = new Set();
  let attempts = 0;
  while (variants.size < 3 && attempts < 30) {
    attempts++;
    const idx = Math.floor(Math.random() * words.length);
    const repl = otherWords[Math.floor(Math.random() * otherWords.length)];
    if (!repl || repl.toLowerCase() === words[idx].toLowerCase()) continue;
    const variant = words.map((w, i) => i === idx ? repl : w).join(" ");
    if (variant !== words.join(" ")) variants.add(variant);
  }
  const opts = [words.join(" "), ...Array.from(variants)].slice(0, 4);
  return opts.sort(() => Math.random() - 0.5);
}
function splitPhrase(phrase) {
  const words = phrase.replace(/[.,!?]/g, "").split(" ");
  const mid = Math.max(1, Math.ceil(words.length / 2));
  return {
    first: words.slice(0, mid).join(" "),
    second: words.slice(mid).join(" ")
  };
}
function pickReviewItems(progress, day, currentWeekId, count = 1) {
  const due = [];
  for (const item of FLAT_BANK) {
    if (item.weekId >= currentWeekId) continue;
    const st = progress[item.id];
    if (st && st.nextDue <= day) due.push({
      item,
      box: st.box
    });
  }
  due.sort((a, b) => a.box - b.box);
  return due.slice(0, count).map(d => d.item);
}
function peekExamItems(examUsedIds, count = 10) {
  let pool = FLAT_BANK.filter(i => !examUsedIds.includes(i.id));
  let resetCycle = false;
  if (pool.length < count) {
    pool = FLAT_BANK;
    resetCycle = true;
  }
  const sorted = [...pool].sort((a, b) => b.priority - a.priority);
  return {
    chosen: sorted.slice(0, count),
    resetCycle
  };
}

/* ===================== ICONO: BUSTO KINTSUGI ===================== */
function StoicBust({
  size = 48
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 100 100",
    fill: "none"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "50",
    cy: "50",
    r: "47",
    stroke: C.bronze,
    strokeWidth: "1.5",
    opacity: "0.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M20 40 Q10 30 16 18 Q22 26 24 36",
    stroke: C.bronzeLight,
    strokeWidth: "2",
    fill: "none",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M14 50 Q4 46 6 34 Q14 38 18 46",
    stroke: C.bronzeLight,
    strokeWidth: "2",
    fill: "none",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M80 40 Q90 30 84 18 Q78 26 76 36",
    stroke: C.bronzeLight,
    strokeWidth: "2",
    fill: "none",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M86 50 Q96 46 94 34 Q86 38 82 46",
    stroke: C.bronzeLight,
    strokeWidth: "2",
    fill: "none",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M50 20 Q40 20 38 32 Q37 40 40 46 Q34 50 32 60 L32 74 Q50 82 68 74 L68 60 Q66 50 60 46 Q63 40 62 32 Q60 20 50 20 Z",
    fill: "none",
    stroke: C.marble,
    strokeWidth: "2.2",
    strokeLinejoin: "round"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M61 36 Q64 39 61 43",
    fill: "none",
    stroke: C.marble,
    strokeWidth: "1.6",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "40",
    y1: "60",
    x2: "60",
    y2: "60",
    stroke: C.bronze,
    strokeWidth: "1",
    opacity: "0.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M46 24 L50 34 L45 44",
    stroke: C.gold,
    strokeWidth: "1.3",
    fill: "none",
    strokeLinecap: "round",
    opacity: "0.9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M50 34 L58 40",
    stroke: C.gold,
    strokeWidth: "1",
    fill: "none",
    strokeLinecap: "round",
    opacity: "0.8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M45 44 L42 54 L46 62",
    stroke: C.gold,
    strokeWidth: "1.1",
    fill: "none",
    strokeLinecap: "round",
    opacity: "0.85"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M58 40 L63 48",
    stroke: C.gold,
    strokeWidth: "0.9",
    fill: "none",
    strokeLinecap: "round",
    opacity: "0.7"
  }));
}
const STAGE_ORDER = ["intro", "reorder", "fillExtra", "mcGram", "mcExtra", "pairs", "translateGram", "translateExtra", "free"];

/* ===================== APP ===================== */
function StayStoicApp() {
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState(defaultMeta());
  const [progress, setProgress] = useState({});
  const [view, setView] = useState("home");
  const [activeDay, setActiveDay] = useState(1);
  const [reviewMode, setReviewMode] = useState(false);
  const [stage, setStage] = useState("intro");
  const [dayData, setDayData] = useState(null); // { weekSlots, extraSlots }
  const [results, setResults] = useState({
    correct: 0,
    wrong: 0
  });
  const [examState, setExamState] = useState(null);
  const [freeInputs, setFreeInputs] = useState(["", ""]);
  const [freeSeed, setFreeSeed] = useState(null);
  const [ringSpin, setRingSpin] = useState(false);
  useEffect(() => {
    (async () => {
      const m = await loadJSON("staystoic_meta_v4", null);
      const p = await loadJSON("staystoic_progress_v4", {});
      setMeta(m || defaultMeta());
      setProgress(p || {});
      setLoading(false);
    })();
  }, []);
  async function persistMeta(m) {
    setMeta(m);
    await saveJSON("staystoic_meta_v4", m);
  }
  async function persistProgress(p) {
    setProgress(p);
    await saveJSON("staystoic_progress_v4", p);
  }
  const week = weekForDay(activeDay);
  const examDay = isExamDay(activeDay);
  function openDay(day, isReview) {
    setActiveDay(day);
    setReviewMode(isReview);
    setResults({
      correct: 0,
      wrong: 0
    });
    setFreeInputs(["", ""]);
    const w = weekForDay(day);
    if (isExamDay(day)) {
      const {
        chosen,
        resetCycle
      } = peekExamItems(meta.examUsedIds || [], 10);
      setExamState({
        items: chosen,
        idx: 0,
        score: 0,
        answered: null,
        options: chosen.length ? buildOptions(chosen[0], chosen) : []
      });
      if (!isReview) {
        const newUsed = resetCycle ? chosen.map(i => i.id) : [...(meta.examUsedIds || []), ...chosen.map(i => i.id)];
        persistMeta({
          ...meta,
          examUsedIds: newUsed
        });
      }
      setStage("exam");
    } else {
      const weekSlots = weekSlotsForDay(day, w);
      const extraSlots = extraSlotsForDay(day);
      const review = pickReviewItems(progress, day, w.id, 1);
      setDayData({
        weekSlots,
        extraSlots,
        review
      });
      const seedPool = [w.ancla, ...extraSlots.read.map(e => e.phrase)];
      setFreeSeed(seedPool[Math.floor(Math.random() * seedPool.length)]);
      setStage("intro");
    }
    setView("day");
  }
  async function markResult(bridge, correct) {
    setResults(r => ({
      correct: r.correct + (correct ? 1 : 0),
      wrong: r.wrong + (correct ? 0 : 1)
    }));
    if (!correct && bridge && bridge !== "mixed" && !reviewMode) {
      const newErrors = {
        ...meta.bridgeErrors,
        [bridge]: (meta.bridgeErrors[bridge] || 0) + 1
      };
      await persistMeta({
        ...meta,
        bridgeErrors: newErrors
      });
    }
  }
  async function markSpaced(item, correct) {
    const st = progress[item.id] || {
      box: 0,
      nextDue: activeDay
    };
    const newBox = correct ? Math.min(st.box + 1, INTERVALS.length) : 1;
    const nextDue = activeDay + INTERVALS[Math.max(newBox - 1, 0)];
    const newProgress = {
      ...progress,
      [item.id]: {
        box: newBox,
        nextDue
      }
    };
    await persistProgress(newProgress);
    await markResult(item.bridge, correct);
  }
  function nextStage() {
    const i = STAGE_ORDER.indexOf(stage);
    if (i + 1 < STAGE_ORDER.length) setStage(STAGE_ORDER[i + 1]);else setView("done");
  }
  function pickExamAnswer(opt) {
    if (examState.answered) return;
    const item = examState.items[examState.idx];
    const correct = opt === item.en;
    setExamState(s => ({
      ...s,
      answered: {
        correct,
        picked: opt
      },
      score: s.score + (correct ? 1 : 0)
    }));
  }
  function nextExamQ() {
    const ni = examState.idx + 1;
    if (ni < examState.items.length) {
      setExamState(s => ({
        ...s,
        idx: ni,
        answered: null,
        options: buildOptions(s.items[ni], s.items)
      }));
    } else setView("done");
  }
  const effectiveness = examDay ? examState && examState.items.length ? examState.score / examState.items.length : 0 : results.correct + results.wrong > 0 ? results.correct / (results.correct + results.wrong) : 0;
  const passed = examDay ? effectiveness >= EFFECTIVENESS_THRESHOLD : effectiveness >= EFFECTIVENESS_THRESHOLD && Boolean(freeInputs[0].trim() && freeInputs[1].trim());
  async function completeDay() {
    if (!passed) return;
    setRingSpin(true);
    setTimeout(async () => {
      let newMeta = meta;
      if (examDay && !reviewMode) {
        const rec = {
          day: activeDay,
          score: examState.score,
          total: examState.items.length
        };
        newMeta = {
          ...newMeta,
          examHistory: [...newMeta.examHistory, rec]
        };
      }
      if (!reviewMode) {
        const newStreak = meta.lastCompletedDay === activeDay - 1 || activeDay === 1 ? meta.streak + 1 : 1;
        const newCompleted = [...meta.completedDays, activeDay];
        newMeta = {
          ...newMeta,
          day: activeDay + 1,
          streak: newStreak,
          lastCompletedDay: activeDay,
          completedDays: newCompleted
        };
      }
      await persistMeta(newMeta);
      setRingSpin(false);
      setView("home");
    }, 900);
  }
  function repeatDay() {
    openDay(activeDay, reviewMode);
  }
  async function bookmarkDay(day) {
    const newMeta = {
      ...meta,
      day
    };
    await persistMeta(newMeta);
    setView("home");
  }
  if (loading) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        ...pageStyle,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, /*#__PURE__*/React.createElement("p", {
      style: {
        color: C.marbleDim,
        fontFamily: sans
      }
    }, "Cargando…"));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: pageStyle
  }, /*#__PURE__*/React.createElement(Header, {
    meta: meta,
    onHome: () => setView("home"),
    onProgress: () => setView("progress")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "20px 18px 40px",
      maxWidth: 480,
      margin: "0 auto"
    }
  }, view === "home" && /*#__PURE__*/React.createElement(HomeView, {
    meta: meta,
    onOpenDay: () => openDay(meta.day, false),
    onCalendar: () => setView("calendar"),
    onReset: async () => {
      const m = defaultMeta();
      await persistMeta(m);
      await persistProgress({});
    }
  }), view === "calendar" && /*#__PURE__*/React.createElement(CalendarView, {
    meta: meta,
    onPick: d => openDay(d, d !== meta.day),
    onBack: () => setView("home")
  }), view === "day" && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "flex-end",
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => bookmarkDay(activeDay),
    style: ghostBtn
  }, "📍 Marcar como mi día actual")), view === "day" && !examDay && dayData && /*#__PURE__*/React.createElement(DayFlow, {
    day: activeDay,
    week: week,
    reviewMode: reviewMode,
    stage: stage,
    dayData: dayData,
    onMarkSpaced: markSpaced,
    onMarkResult: markResult,
    onNextStage: nextStage,
    freeInputs: freeInputs,
    setFreeInputs: setFreeInputs,
    freeSeed: freeSeed
  }), view === "day" && examDay && /*#__PURE__*/React.createElement(ExamBlock, {
    examState: examState,
    onExamPick: pickExamAnswer,
    onExamNext: nextExamQ
  }), view === "done" && /*#__PURE__*/React.createElement(DoneView, {
    isExam: examDay,
    results: results,
    examState: examState,
    effectiveness: effectiveness,
    passed: passed,
    ringSpin: ringSpin,
    reviewMode: reviewMode,
    onComplete: completeDay,
    onRepeat: repeatDay,
    onBackHome: () => setView("home")
  }), view === "progress" && /*#__PURE__*/React.createElement(ProgressView, {
    meta: meta,
    onBack: () => setView("home")
  })));
}


const STOIC_MOMENTS = [
  { author: "MARCO AURELIO", quote: "Gobierna tu mente; lo externo no necesita gobernarte." },
  { author: "SÉNECA", quote: "La dificultad revela la fuerza que la comodidad mantiene escondida." },
  { author: "EPICTETO", quote: "Distingue lo que depende de ti y suelta lo demás." },
  { author: "MARCO AURELIO", quote: "Tu vida toma la forma de los pensamientos que alimentas." },
  { author: "SÉNECA", quote: "No esperes una vida sin problemas; aprende a atravesarlos mejor." },
  { author: "EPICTETO", quote: "La libertad empieza cuando dejas de exigir que todo ocurra a tu manera." },
  { author: "MARCO AURELIO", quote: "Haz lo correcto aunque nadie esté mirando." },
  { author: "SÉNECA", quote: "El tiempo es tu posesión más valiosa; no lo entregues sin pensar." },
  { author: "EPICTETO", quote: "No controles el resultado; controla tu respuesta." },
  { author: "MARCO AURELIO", quote: "Lo que obstaculiza el camino puede convertirse en parte del camino." },
  { author: "SÉNECA", quote: "La calma se entrena antes de necesitarla." },
  { author: "EPICTETO", quote: "Practica hoy la persona que quieres ser bajo presión." },
  { author: "MARCO AURELIO", quote: "No añadas una segunda herida con una mala interpretación." },
  { author: "SÉNECA", quote: "Quien necesita poco conserva más libertad." },
  { author: "EPICTETO", quote: "La opinión que das a un hecho puede doler más que el hecho mismo." },
  { author: "MARCO AURELIO", quote: "Cada mañana es otra oportunidad para actuar con carácter." },
  { author: "SÉNECA", quote: "Prepararte para la adversidad reduce el poder de la sorpresa." },
  { author: "EPICTETO", quote: "Si quieres mejorar, acepta parecer principiante por un tiempo." },
  { author: "MARCO AURELIO", quote: "No desperdicies el presente discutiendo con lo inevitable." },
  { author: "SÉNECA", quote: "La riqueza también consiste en saber cuándo ya tienes suficiente." },
  { author: "EPICTETO", quote: "No pidas menos dificultades; construye mejor juicio." },
  { author: "MARCO AURELIO", quote: "Tu tarea es sencilla: pensar con claridad y actuar con justicia." },
  { author: "SÉNECA", quote: "Una mente ocupada no siempre es una mente bien dirigida." },
  { author: "EPICTETO", quote: "Antes de reaccionar, pregúntate qué parte sí está bajo tu control." },
  { author: "MARCO AURELIO", quote: "La paciencia también es una forma de fortaleza." },
  { author: "SÉNECA", quote: "No conviertas una posibilidad futura en sufrimiento presente." },
  { author: "EPICTETO", quote: "El progreso se nota más en tus reacciones que en tus palabras." },
  { author: "MARCO AURELIO", quote: "Cumple tu deber sin necesitar aplausos." },
  { author: "SÉNECA", quote: "La disciplina de hoy compra tranquilidad para mañana." },
  { author: "EPICTETO", quote: "No es pérdida si nunca estuvo realmente bajo tu control." },
  { author: "MARCO AURELIO", quote: "No te rebajes intentando vencer a alguien en su propio mal carácter." },
  { author: "SÉNECA", quote: "Aprende a estar contigo mismo sin necesitar escapar." },
  { author: "EPICTETO", quote: "Tu carácter se fortalece cada vez que eliges bien bajo presión." },
  { author: "MARCO AURELIO", quote: "El presente es suficiente para practicar virtud." },
  { author: "SÉNECA", quote: "Quien vive aplazando también aplaza su propia vida." },
  { author: "EPICTETO", quote: "No confundas comodidad con libertad." },
  { author: "MARCO AURELIO", quote: "Acepta el momento y úsalo bien." },
  { author: "SÉNECA", quote: "Un contratiempo puede ser entrenamiento si decides aprender de él." },
  { author: "EPICTETO", quote: "No necesitas controlar a otros para gobernarte a ti mismo." },
  { author: "MARCO AURELIO", quote: "Haz menos, pero haz lo necesario con plena atención." },
  { author: "SÉNECA", quote: "La serenidad requiere límites, no solo buenas intenciones." },
  { author: "EPICTETO", quote: "No negocies tus principios por una emoción momentánea." },
  { author: "MARCO AURELIO", quote: "Lo que hoy parece pesado también pasará." },
  { author: "SÉNECA", quote: "Ensaya mentalmente la pérdida para valorar mejor lo que tienes." },
  { author: "EPICTETO", quote: "La práctica convierte la filosofía en carácter." },
  { author: "MARCO AURELIO", quote: "Sé exigente con tus actos y comprensivo con los ajenos." },
  { author: "SÉNECA", quote: "No toda urgencia merece tu atención." },
  { author: "EPICTETO", quote: "Tu paz mejora cuando tus expectativas se vuelven más realistas." },
  { author: "MARCO AURELIO", quote: "No busques una ocasión perfecta para actuar correctamente." },
  { author: "SÉNECA", quote: "Vive de modo que el final del día no te encuentre debiéndote a ti mismo." }
];

function StoicMomentCard({ day }) {
  const item = STOIC_MOMENTS[(Math.max(1, day) - 1) % STOIC_MOMENTS.length];
  const bustSrc = item.author === "SÉNECA" ? "seneca.webp" : item.author === "EPICTETO" ? "epictetus.webp" : "app-icon.webp";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      overflow: "hidden",
      minHeight: 150,
      border: `1px solid ${C.line}`,
      borderRadius: 18,
      marginBottom: 16,
      background: `linear-gradient(135deg, ${C.bgSoft} 0%, ${C.bg} 72%)`,
      boxShadow: "0 14px 32px rgba(0,0,0,0.2)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      zIndex: 2,
      width: "67%",
      padding: "20px 18px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.bronzeLight,
      fontSize: 10,
      fontWeight: 800,
      letterSpacing: 1.1,
      marginBottom: 10
    }
  }, "MOMENTO ESTOICO"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marble,
      fontFamily: serif,
      fontSize: 19,
      lineHeight: 1.35,
      fontStyle: "italic"
    }
  }, "“", item.quote, "”"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.bronzeLight,
      fontSize: 10.5,
      fontWeight: 800,
      letterSpacing: 1,
      marginTop: 12
    }
  }, "— IDEA DE ", item.author)), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: "0 0 0 auto",
      width: "45%",
      background: `linear-gradient(90deg, rgba(0,0,0,0) 0%, ${C.bg} 94%)`,
      zIndex: 1
    }
  }), /*#__PURE__*/React.createElement("img", {
    src: bustSrc,
    alt: "Busto de " + item.author,
    style: {
      position: "absolute",
      right: -10,
      bottom: -12,
      width: 150,
      height: 150,
      objectFit: "cover",
      objectPosition: "50% 18%",
      borderRadius: "50%",
      opacity: 0.78,
      filter: "sepia(0.22) contrast(1.05)",
      zIndex: 0
    }
  }));
}

/* ===================== HEADER / HOME / CALENDAR ===================== */
const pageStyle = {
  minHeight: "100vh",
  background: C.bg,
  fontFamily: sans
};
function Header({
  meta,
  onHome,
  onProgress
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "26px 18px 18px",
      borderBottom: `1px solid ${C.line}`,
      background: C.bg
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: onHome,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      cursor: "pointer",
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "app-icon.webp",
    alt: "Marco Aurelio",
    style: {
      width: 46,
      height: 46,
      borderRadius: "50%",
      objectFit: "cover",
      border: `1px solid ${C.bronze}`,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: { minWidth: 0 }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: serif,
      color: C.marble,
      fontSize: 22,
      lineHeight: 1.05,
      letterSpacing: 0.8,
      whiteSpace: "nowrap"
    }
  }, "Stay Stoic"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marbleDim,
      fontSize: 12,
      marginTop: 4
    }
  }, "Día ", meta.day, " de ", TOTAL_DAYS))), /*#__PURE__*/React.createElement("button", {
    onClick: onProgress,
    style: {
      ...ghostBtn,
      padding: "9px 12px",
      minWidth: 58,
      justifyContent: "center",
      color: C.marble
    }
  }, /*#__PURE__*/React.createElement(Flame, {
    size: 17,
    color: C.bronzeLight
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: C.marble,
      fontSize: 13
    }
  }, meta.streak)));
}
function HomeView({
  meta,
  onOpenDay,
  onCalendar,
  onReset
}) {
  const w = weekForDay(meta.day);
  const exam = isExamDay(meta.day);
  const completedPct = Math.round((meta.completedDays.length / TOTAL_DAYS) * 100);

  const moduleRow = (num, title, subtitle) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "14px 0",
      borderBottom: num < 4 ? `1px solid ${C.line}` : "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 34,
      height: 34,
      borderRadius: "50%",
      border: `1px solid ${C.bronze}`,
      color: C.bronzeLight,
      fontWeight: 800,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0
    }
  }, num), /*#__PURE__*/React.createElement("div", {
    style: { flex: 1, minWidth: 0 }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marble,
      fontFamily: serif,
      fontSize: 17,
      lineHeight: 1.15
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marbleDim,
      fontSize: 11.5,
      lineHeight: 1.45,
      marginTop: 3
    }
  }, subtitle)), /*#__PURE__*/React.createElement(ChevronRight, {
    size: 16,
    color: C.bronzeLight
  }));

  return /*#__PURE__*/React.createElement("div", null,
  /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "8px 2px 14px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marble,
      fontSize: 14,
      fontWeight: 700
    }
  }, "Día ", meta.day, " de ", TOTAL_DAYS), /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marbleDim,
      fontSize: 11.5,
      marginTop: 3
    }
  }, exam ? "Examen semanal" : "Modo enfoque")), /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.bronzeLight,
      fontSize: 11.5,
      fontWeight: 700
    }
  }, completedPct, "% completado")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 5,
      background: C.bgSoft,
      borderRadius: 999,
      overflow: "hidden",
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: "100%",
      width: Math.max(2, completedPct) + "%",
      background: C.bronze,
      borderRadius: 999
    }
  }))),

  /*#__PURE__*/React.createElement(StoicMomentCard, {
    day: meta.day
  }),

  /*#__PURE__*/React.createElement("div", {
    style: {
      ...cardStyle,
      padding: "20px 18px",
      background: `linear-gradient(135deg, ${C.bgSoft} 0%, ${C.bg} 100%)`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.bronzeLight,
      fontSize: 10.5,
      fontWeight: 800,
      letterSpacing: 1.1,
      marginBottom: 7
    }
  }, exam ? "EXAMEN" : "LECCIÓN DE HOY"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marble,
      fontFamily: serif,
      fontSize: 26,
      lineHeight: 1.12
    }
  }, w.title), /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marbleDim,
      fontSize: 12,
      lineHeight: 1.55,
      marginTop: 7
    }
  }, exam ? "Pon a prueba lo trabajado durante la semana." : "Aprende. Aplica. Repite hasta que la estructura salga con naturalidad.")),

  !exam && /*#__PURE__*/React.createElement("div", {
    style: {
      ...cardStyle,
      padding: "0 16px"
    }
  }, moduleRow(1, "Estructuras modelo", "Observa cómo se usa la gramática en contexto."), moduleRow(2, "Shadowing", "Escucha, repite y practica en 3 rondas."), moduleRow(3, "Lectura profunda", "Lee por significado y analiza la estructura."), moduleRow(4, "Audio / Velocidad", "Ajusta el ritmo de todos los audios.")),

  /*#__PURE__*/React.createElement("button", {
    onClick: onOpenDay,
    style: {
      ...primaryBtn(exam ? C.terracotta : C.bronze),
      minHeight: 58,
      fontFamily: serif,
      fontSize: 17,
      fontWeight: 700
    }
  }, exam ? "Comenzar examen semanal" : "Continuar", " ", /*#__PURE__*/React.createElement(ChevronRight, {
    size: 18
  })),

  /*#__PURE__*/React.createElement("button", {
    onClick: onCalendar,
    style: {
      ...ghostBtn,
      width: "100%",
      justifyContent: "center",
      marginTop: 10,
      padding: "12px"
    }
  }, /*#__PURE__*/React.createElement(Calendar, {
    size: 14
  }), " Ver calendario"),

  /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      color: C.marbleDim,
      fontSize: 10,
      letterSpacing: 1.4,
      marginTop: 22,
      paddingBottom: 6
    }
  }, "DISCIPLINA HOY · MÁS LIBERTAD MAÑANA"),

  /*#__PURE__*/React.createElement("button", {
    onClick: onReset,
    style: {
      ...ghostBtn,
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement(RotateCcw, {
    size: 13
  }), " Reiniciar progreso"));
}
function CalendarView({
  meta,
  onPick,
  onBack
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    style: ghostBtn
  }, /*#__PURE__*/React.createElement(ChevronLeft, {
    size: 14
  }), " Volver"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: serif,
      color: C.marble,
      fontSize: 20,
      margin: "14px 0 4px"
    }
  }, "Día 1 — ", TOTAL_DAYS), /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marbleDim,
      fontSize: 12,
      marginBottom: 16
    }
  }, "Verde: completado · Bronce: día actual · Toca cualquier día para practicarlo (todos están abiertos)"), WEEKS.map(w => /*#__PURE__*/React.createElement("div", {
    key: w.id,
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.bronzeLight,
      fontSize: 11.5,
      marginBottom: 6,
      letterSpacing: 0.5
    }
  }, "SEMANA ", w.id, " · ", w.title.toUpperCase()), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 6
    }
  }, Array.from({
    length: w.range[1] - w.range[0] + 1
  }, (_, i) => w.range[0] + i).map(d => {
    const done = meta.completedDays.includes(d);
    const isCurrent = d === meta.day;
    let bg = C.bgSoft,
      border = C.line,
      color = C.marbleDim;
    if (done) {
      bg = C.verdigris;
      border = C.verdigris;
      color = C.marble;
    }
    if (isCurrent) {
      bg = C.bronze;
      border = C.bronzeLight;
      color = C.marble;
    }
    return /*#__PURE__*/React.createElement("div", {
      key: d,
      onClick: () => onPick(d),
      style: {
        width: 34,
        height: 34,
        borderRadius: 4,
        background: bg,
        border: `1px solid ${border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        fontSize: 11,
        color
      }
    }, d);
  })))));
}
function Row({
  label,
  value
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      padding: "6px 0",
      fontSize: 13.5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: C.marbleDim
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      color: C.marble
    }
  }, value));
}

/* ===================== FLUJO DEL DIA ===================== */
function DayFlow({
  day,
  week,
  reviewMode,
  stage,
  dayData,
  onMarkSpaced,
  onMarkResult,
  onNextStage,
  freeInputs,
  setFreeInputs,
  freeSeed
}) {
  const {
    weekSlots,
    extraSlots,
    review
  } = dayData;
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 14,
      padding: "4px 2px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.bronzeLight,
      fontSize: 10.5,
      fontWeight: 700,
      letterSpacing: 1.2,
      textTransform: "uppercase",
      marginBottom: 6
    }
  }, "DÍA ", day, reviewMode ? " · MODO REPASO" : " · SESIÓN ACTUAL"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marble,
      fontFamily: serif,
      fontSize: 28,
      lineHeight: 1.12,
      marginBottom: 6
    }
  }, week.title), /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marbleDim,
      fontSize: 12,
      lineHeight: 1.5
    }
  }, "Practica la estructura, escucha con intención y termina produciendo por tu cuenta.")), stage === "intro" && /*#__PURE__*/React.createElement(StoicMomentCard, {
    day: day
  }), /*#__PURE__*/React.createElement(StageDots, {
    stage: stage
  }), stage === "intro" && /*#__PURE__*/React.createElement(IntroStage, {
    day: day,
    week: week,
    structureModel: weekSlots.structureModel,
    extras: extraSlots.read,
    onNext: onNextStage
  }), stage === "reorder" && /*#__PURE__*/React.createElement(ReorderStage, {
    items: [...weekSlots.reorder, ...review],
    bridge: week.bridge,
    onMark: onMarkSpaced,
    onDone: onNextStage
  }), stage === "fillExtra" && /*#__PURE__*/React.createElement(FillExtraStage, {
    items: extraSlots.fillblank,
    onMark: onMarkResult,
    onDone: onNextStage
  }), stage === "mcGram" && /*#__PURE__*/React.createElement(McGramStage, {
    items: weekSlots.mcGram,
    bridge: week.bridge,
    onMark: onMarkSpaced,
    onDone: onNextStage
  }), stage === "mcExtra" && /*#__PURE__*/React.createElement(McExtraStage, {
    items: extraSlots.mc,
    onMark: onMarkResult,
    onDone: onNextStage
  }), stage === "pairs" && /*#__PURE__*/React.createElement(PairsStage, {
    gramItems: weekSlots.pairsGram,
    extraItems: extraSlots.pairs,
    bridge: week.bridge,
    onMark: onMarkResult,
    onDone: onNextStage
  }), stage === "translateGram" && /*#__PURE__*/React.createElement(TranslateGramStage, {
    items: weekSlots.translateGram,
    bridge: week.bridge,
    onMark: onMarkSpaced,
    onDone: onNextStage
  }), stage === "translateExtra" && /*#__PURE__*/React.createElement(TranslateExtraStage, {
    items: extraSlots.translate,
    onMark: onMarkResult,
    onDone: onNextStage
  }), stage === "free" && /*#__PURE__*/React.createElement(FreeStage, {
    seed: freeSeed,
    freeInputs: freeInputs,
    setFreeInputs: setFreeInputs,
    onDone: onNextStage
  }));
}
function StageDots({
  stage
}) {
  const idx = STAGE_ORDER.indexOf(stage);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 4,
      marginBottom: 16
    }
  }, STAGE_ORDER.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: s,
    style: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      background: i <= idx ? C.bronze : C.bgSoft
    }
  })));
}

/* ---------- 1-5: intro ---------- */
function IntroStage({
  day,
  week,
  structureModel,
  extras,
  onNext
}) {
  const [shadowHidden, setShadowHidden] = useState(false);
  const [speechRate, setSpeechRateState] = useState(getSpeechRate());
  const deepReading = deepReadingForDay(day, week, structureModel);
  const changeSpeechRate = rate => {
    const next = setSpeechRate(rate);
    setSpeechRateState(next);
  };

  const head = (num, title, subtitle, meta) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 34,
      height: 34,
      borderRadius: "50%",
      border: `1px solid ${C.bronze}`,
      color: C.bronzeLight,
      fontWeight: 800,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0
    }
  }, num), /*#__PURE__*/React.createElement("div", {
    style: { flex: 1, minWidth: 0 }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marble,
      fontFamily: serif,
      fontSize: 18,
      lineHeight: 1.1
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marbleDim,
      fontSize: 11.5,
      lineHeight: 1.4,
      marginTop: 3
    }
  }, subtitle)), meta && /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marbleDim,
      fontSize: 10.5,
      whiteSpace: "nowrap"
    }
  }, meta));

  return /*#__PURE__*/React.createElement("div", null,

  /*#__PURE__*/React.createElement("div", {
    style: {
      ...cardStyle,
      padding: "16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.bronzeLight,
      fontSize: 10.5,
      fontWeight: 800,
      letterSpacing: 0.8,
      marginBottom: 10
    }
  }, "VOCABULARIO CLAVE"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gap: 8
    }
  }, week.vocab.map((v, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      border: `1px solid ${C.line}`,
      borderRadius: 10,
      padding: "10px",
      background: C.bg,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: { flex: 1, minWidth: 0 }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marble,
      fontSize: 12.5,
      lineHeight: 1.3,
      overflowWrap: "anywhere"
    }
  }, v[0]), /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marbleDim,
      fontSize: 10.5,
      marginTop: 3
    }
  }, v[1])), /*#__PURE__*/React.createElement("button", {
    onClick: () => speak(v[0]),
    style: {
      ...iconBtn,
      minWidth: 34,
      minHeight: 34,
      padding: 7
    }
  }, /*#__PURE__*/React.createElement(Volume2, {
    size: 13,
    color: C.bronzeLight
  }))))))),

  /*#__PURE__*/React.createElement("div", {
    style: {
      ...cardStyle,
      padding: "18px 16px"
    }
  }, head("1", "Estructuras modelo", "Observa cómo se usa en contexto.", structureModel.length + " frases"), structureModel.map((item, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 0",
      borderBottom: i < structureModel.length - 1 ? `1px solid ${C.line}` : "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marble,
      fontFamily: serif,
      fontSize: 15,
      lineHeight: 1.5
    }
  }, item.en), /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marbleDim,
      fontSize: 10.5,
      lineHeight: 1.35,
      marginTop: 3
    }
  }, item.es)), /*#__PURE__*/React.createElement("button", {
    onClick: () => speak(item.en),
    style: iconBtn
  }, /*#__PURE__*/React.createElement(Volume2, {
    size: 14,
    color: C.bronzeLight
  }))))),

  /*#__PURE__*/React.createElement("div", {
    style: {
      ...cardStyle,
      padding: "18px 16px"
    }
  }, head("2", "Shadowing", "Escucha, repite y practica.", "3 rondas"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
      gap: 8,
      marginBottom: 12
    }
  }, [["1","Escucha"],["2","Repite con texto"],["3","Oculta y repite"]].map((step, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      border: `1px solid ${i===0 ? C.bronze : C.line}`,
      borderRadius: 10,
      padding: "9px 5px",
      textAlign: "center",
      background: i===0 ? C.bg : "transparent"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: i===0 ? C.bronzeLight : C.marbleDim,
      fontWeight: 800,
      fontSize: 12,
      marginBottom: 3
    }
  }, step[0]), /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marble,
      fontSize: 10,
      lineHeight: 1.25
    }
  }, step[1])))), structureModel.map((item, i) => /*#__PURE__*/React.createElement("div", {
    key: "sh-"+i,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "8px 0",
      borderBottom: i < structureModel.length - 1 ? `1px solid ${C.line}` : "none"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      color: shadowHidden ? C.bgSoft : C.marble,
      fontSize: 12.5,
      lineHeight: 1.5
    }
  }, shadowHidden ? "••••••••••••••••" : item.en), /*#__PURE__*/React.createElement("button", {
    onClick: () => speak(item.en),
    style: iconBtn
  }, /*#__PURE__*/React.createElement(Volume2, {
    size: 14,
    color: C.bronzeLight
  })))), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShadowHidden(!shadowHidden),
    style: {
      ...ghostBtn,
      marginTop: 10
    }
  }, shadowHidden ? "Mostrar texto" : "Ocultar texto · ronda 3")),

  /*#__PURE__*/React.createElement("div", {
    style: {
      ...cardStyle,
      padding: "18px 16px"
    }
  }, head("3", "Lectura profunda", "Lee por significado y analiza la estructura.", deepReading.length + " líneas"), deepReading.map((line, i) => /*#__PURE__*/React.createElement("div", {
    key: "deep-"+i,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "12px 0",
      borderBottom: i < deepReading.length - 1 ? `1px solid ${C.line}` : "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.bronzeLight,
      fontSize: 10,
      fontWeight: 800,
      letterSpacing: 0.6,
      marginBottom: 4
    }
  }, "LÍNEA ", i+1), /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marble,
      fontFamily: serif,
      fontSize: 15.5,
      lineHeight: 1.6
    }
  }, line)), /*#__PURE__*/React.createElement("button", {
    onClick: () => speak(line),
    style: iconBtn
  }, /*#__PURE__*/React.createElement(Volume2, {
    size: 15,
    color: C.bronzeLight
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      padding: "11px 12px",
      background: C.bg,
      border: `1px solid ${C.line}`,
      borderRadius: 10,
      color: C.marbleDim,
      fontSize: 11.5,
      lineHeight: 1.5
    }
  }, "Primero, lee por el significado. Después, fíjate en la estructura y cómo se usa en contexto.")),

  /*#__PURE__*/React.createElement("div", {
    style: {
      ...cardStyle,
      padding: "18px 16px"
    }
  }, head("4", "Audio / Velocidad", "Selecciona la velocidad para todos los audios.", null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
      gap: 6
    }
  }, [0.7,0.85,1.0,1.15,1.3].map(rate => /*#__PURE__*/React.createElement("button", {
    key: rate,
    onClick: () => changeSpeechRate(rate),
    style: {
      border: `1px solid ${speechRate===rate ? C.bronze : C.line}`,
      borderRadius: 10,
      minHeight: 44,
      background: speechRate===rate ? C.bronze : C.bg,
      color: speechRate===rate ? C.bg : C.marble,
      fontWeight: speechRate===rate ? 800 : 600,
      fontSize: 11,
      cursor: "pointer"
    }
  }, rate.toFixed(rate===1 ? 1 : 2).replace(/0$/,""), "×"))), /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marbleDim,
      fontSize: 10.5,
      marginTop: 10,
      lineHeight: 1.45
    }
  }, "La velocidad seleccionada se aplica a todos los audios de la lección.")),

  extras.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      ...cardStyle,
      padding: "16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marbleDim,
      fontSize: 10.5,
      fontWeight: 700,
      letterSpacing: 0.6,
      marginBottom: 8
    }
  }, "BANCO DE EXPRESIONES"), extras.map((e,i) => /*#__PURE__*/React.createElement("div", {
    key:i,
    style:{
      display:"flex",
      alignItems:"center",
      gap:8,
      padding:"7px 0",
      borderBottom:i<extras.length-1 ? `1px solid ${C.line}` : "none"
    }
  }, /*#__PURE__*/React.createElement("span",{
    style:{
      flex:1,
      color:C.gold,
      fontFamily:serif,
      fontStyle:"italic",
      fontSize:13.5
    }
  },e.phrase), /*#__PURE__*/React.createElement("button",{
    onClick:()=>speak(e.phrase),
    style:iconBtn
  }, /*#__PURE__*/React.createElement(Volume2,{
    size:13,
    color:C.bronzeLight
  }))))),

  /*#__PURE__*/React.createElement("button", {
    onClick: onNext,
    style: {
      ...primaryBtn(C.bronze),
      minHeight: 58,
      fontFamily: serif,
      fontSize: 17,
      fontWeight: 700
    }
  }, "Continuar ", /*#__PURE__*/React.createElement(ChevronRight, {
    size: 18
  })));
}
/* ---------- 6-7: reordenar fragmentos (gramatica) ---------- */
function ReorderStage({
  items,
  bridge,
  onMark,
  onDone
}) {
  const [idx, setIdx] = useState(0);
  const item = items[idx];
  const rd = useMemo(() => item ? buildReorder(item) : null, [item && item.id]);
  const [built, setBuilt] = useState([]);
  const [pool, setPool] = useState([]);
  useEffect(() => {
    if (rd) {
      setBuilt([]);
      setPool(rd.shuffled);
    }
  }, [item && item.id]);
  if (!item) {
    onDone();
    return null;
  }
  function tapWord(w, i) {
    setBuilt([...built, w]);
    setPool(pool.filter((_, x) => x !== i));
  }
  function reset() {
    setBuilt([]);
    setPool(rd.shuffled);
  }
  const done = pool.length === 0;
  const correct = built.join(" ") === rd.words.join(" ");
  function submit() {
    onMark(item, correct);
    if (idx + 1 < items.length) setIdx(idx + 1);else onDone();
  }
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marbleDim,
      fontSize: 11,
      marginBottom: 6
    }
  }, "PASO 6-7 · ORDENA LA FRASE · ", idx + 1, "/", items.length), /*#__PURE__*/React.createElement("div", {
    style: cardStyle
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marbleDim,
      fontSize: 12,
      marginBottom: 14,
      fontStyle: "italic"
    }
  }, item.es), /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: 40,
      borderBottom: `1px solid ${C.line}`,
      paddingBottom: 10,
      marginBottom: 14,
      fontFamily: serif,
      color: C.marble,
      fontSize: 16
    }
  }, built.join(" ")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 6
    }
  }, pool.map((w, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    onClick: () => tapWord(w, i),
    style: {
      padding: "7px 10px",
      borderRadius: 4,
      border: `1px solid ${C.bronze}`,
      background: "transparent",
      color: C.marble,
      fontSize: 13.5
    }
  }, w)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: reset,
    style: {
      ...ghostBtn,
      flex: 1,
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(RotateCcw, {
    size: 13
  }), " Reiniciar"), done && /*#__PURE__*/React.createElement("button", {
    onClick: submit,
    style: {
      ...primaryBtn(correct ? C.verdigris : C.terracotta),
      flex: 2,
      marginTop: 0
    }
  }, correct ? "¡Correcto! Siguiente" : "Ver y continuar", " ", /*#__PURE__*/React.createElement(ChevronRight, {
    size: 16
  }))), done && !correct && /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marbleDim,
      fontSize: 12.5,
      marginTop: 10
    }
  }, "Frase correcta: ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: C.marble,
      fontStyle: "italic"
    }
  }, rd.words.join(" "))));
}

/* ---------- 8-9: completar espacio (banco extra) ---------- */
function FillExtraStage({
  items,
  onMark,
  onDone
}) {
  const [idx, setIdx] = useState(0);
  const item = items[idx];
  const fb = useMemo(() => item ? genericBlank(item.phrase, items) : null, [item && item.id]);
  const [picked, setPicked] = useState(null);
  useEffect(() => setPicked(null), [idx]);
  if (!item) {
    onDone();
    return null;
  }
  if (!fb) {
    if (idx + 1 < items.length) {
      setIdx(idx + 1);
      return null;
    }
    onDone();
    return null;
  }
  function submit(correct) {
    onMark(null, correct);
    if (idx + 1 < items.length) setIdx(idx + 1);else onDone();
  }
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marbleDim,
      fontSize: 11,
      marginBottom: 6
    }
  }, "PASO 8-9 · COMPLETA (BANCO) · ", idx + 1, "/", items.length), /*#__PURE__*/React.createElement("div", {
    style: cardStyle
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marbleDim,
      fontSize: 11,
      marginBottom: 8
    }
  }, "COMPLETA LA EXPRESIÓN"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: serif,
      color: C.gold,
      fontSize: 18,
      fontStyle: "italic"
    }
  }, fb.blanked)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, fb.options.map((opt, i) => {
    let border = C.line,
      color = C.marble;
    if (picked) {
      if (opt === fb.correct) {
        border = C.verdigris;
        color = "#8FB09E";
      } else if (opt === picked) {
        border = C.terracotta;
        color = C.terracotta;
      }
    }
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      disabled: !!picked,
      onClick: () => setPicked(opt),
      style: {
        flex: 1,
        padding: "12px 8px",
        borderRadius: 4,
        border: `1px solid ${border}`,
        background: "transparent",
        color,
        fontSize: 14
      }
    }, opt);
  })), picked && /*#__PURE__*/React.createElement("button", {
    onClick: () => submit(picked === fb.correct),
    style: primaryBtn(C.bronze)
  }, "Siguiente ", /*#__PURE__*/React.createElement(ChevronRight, {
    size: 18
  })));
}

/* ---------- 10-11: opcion multiple (gramatica) ---------- */
function McGramStage({
  items,
  bridge,
  onMark,
  onDone
}) {
  const [idx, setIdx] = useState(0);
  const item = items[idx];
  const options = useMemo(() => item ? buildOptions(item, items) : [], [item && item.id]);
  const [picked, setPicked] = useState(null);
  useEffect(() => setPicked(null), [idx]);
  if (!item) {
    onDone();
    return null;
  }
  function submit(correct) {
    onMark(item, correct);
    if (idx + 1 < items.length) setIdx(idx + 1);else onDone();
  }
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marbleDim,
      fontSize: 11,
      marginBottom: 6
    }
  }, "PASO 10-11 · OPCIÓN MÚLTIPLE · ", idx + 1, "/", items.length), /*#__PURE__*/React.createElement("div", {
    style: cardStyle
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marbleDim,
      fontSize: 11,
      marginBottom: 8
    }
  }, "TRADUCE AL INGLÉS"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: serif,
      color: C.marble,
      fontSize: 18
    }
  }, item.es)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, options.map((opt, i) => {
    let border = C.line,
      color = C.marble;
    if (picked) {
      if (opt === item.en) {
        border = C.verdigris;
        color = "#8FB09E";
      } else if (opt === picked) {
        border = C.terracotta;
        color = C.terracotta;
      }
    }
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      disabled: !!picked,
      onClick: () => setPicked(opt),
      style: {
        textAlign: "left",
        padding: "12px 14px",
        borderRadius: 4,
        border: `1px solid ${border}`,
        background: "transparent",
        color,
        fontSize: 14
      }
    }, opt);
  })), picked && /*#__PURE__*/React.createElement("button", {
    onClick: () => submit(picked === item.en),
    style: primaryBtn(C.bronze)
  }, "Siguiente ", /*#__PURE__*/React.createElement(ChevronRight, {
    size: 18
  })));
}

/* ---------- 12-13: opcion multiple (banco extra) — frase correcta ---------- */
function McExtraStage({
  items,
  onMark,
  onDone
}) {
  const [idx, setIdx] = useState(0);
  const item = items[idx];
  const options = useMemo(() => item ? buildPhraseVariants(item.phrase, items) : [], [item && item.id]);
  const [picked, setPicked] = useState(null);
  useEffect(() => setPicked(null), [idx]);
  if (!item) {
    onDone();
    return null;
  }
  function submit(correct) {
    onMark(null, correct);
    if (idx + 1 < items.length) setIdx(idx + 1);else onDone();
  }
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marbleDim,
      fontSize: 11,
      marginBottom: 6
    }
  }, "PASO 12-13 · ¿CUÁL ESTÁ BIEN ESCRITA? · ", idx + 1, "/", items.length), /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marbleDim,
      fontSize: 12,
      marginBottom: 14
    }
  }, "Elige la expresión correcta:"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, options.map((opt, i) => {
    let border = C.line,
      color = C.marble;
    if (picked) {
      if (opt === item.phrase) {
        border = C.verdigris;
        color = "#8FB09E";
      } else if (opt === picked) {
        border = C.terracotta;
        color = C.terracotta;
      }
    }
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      disabled: !!picked,
      onClick: () => setPicked(opt),
      style: {
        textAlign: "left",
        padding: "12px 14px",
        borderRadius: 4,
        border: `1px solid ${border}`,
        background: "transparent",
        color,
        fontSize: 14,
        fontStyle: "italic"
      }
    }, opt);
  })), picked && /*#__PURE__*/React.createElement("button", {
    onClick: () => submit(picked === item.phrase),
    style: primaryBtn(C.bronze)
  }, "Siguiente ", /*#__PURE__*/React.createElement(ChevronRight, {
    size: 18
  })));
}

/* ---------- 14-15: juntar pares (gramatica ES-EN + banco extra mitad/mitad, TODO EN UNA SOLA FASE) ---------- */
function PairsStage({
  gramItems,
  extraItems,
  bridge,
  onMark,
  onDone
}) {
  const left = useMemo(() => [...gramItems.map(i => ({
    id: i.id,
    label: i.es
  })), ...extraItems.map((i, x) => ({
    id: "X" + x,
    label: splitPhrase(i.phrase).first
  }))], [gramItems, extraItems]);
  const rightBase = useMemo(() => [...gramItems.map(i => ({
    id: i.id,
    label: i.en
  })), ...extraItems.map((i, x) => ({
    id: "X" + x,
    label: splitPhrase(i.phrase).second
  }))], [gramItems, extraItems]);
  const right = useMemo(() => [...rightBase].sort(() => Math.random() - 0.5), [rightBase]);
  const [matched, setMatched] = useState([]);
  const [selL, setSelL] = useState(null);
  const [selR, setSelR] = useState(null);
  const [flash, setFlash] = useState(null);
  const [wrongCount, setWrongCount] = useState(0);
  useEffect(() => {
    if (selL && selR) {
      const ok = selL === selR;
      setFlash({
        l: selL,
        r: selR,
        ok
      });
      if (ok) {
        setTimeout(() => {
          setMatched(m => [...m, selL]);
          setSelL(null);
          setSelR(null);
          setFlash(null);
        }, 400);
      } else {
        setWrongCount(c => c + 1);
        setTimeout(() => {
          setSelL(null);
          setSelR(null);
          setFlash(null);
        }, 500);
      }
    }
  }, [selL, selR]);
  const done = matched.length === left.length;
  function finish() {
    onMark(bridge, wrongCount === 0);
    onDone();
  }
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marbleDim,
      fontSize: 11,
      marginBottom: 6
    }
  }, "PASO 14-15 · JUNTAR PARES (gramática + banco)"), /*#__PURE__*/React.createElement("div", {
    style: cardStyle
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, left.map(it => {
    const isMatched = matched.includes(it.id);
    const isSel = selL === it.id;
    const isFlash = flash && flash.l === it.id;
    let border = C.line,
      color = C.marble;
    if (isMatched) {
      border = C.verdigris;
      color = C.verdigris;
    } else if (isFlash) {
      border = flash.ok ? C.verdigris : C.terracotta;
      color = flash.ok ? "#8FB09E" : C.terracotta;
    } else if (isSel) {
      border = C.bronzeLight;
    }
    return /*#__PURE__*/React.createElement("button", {
      key: it.id,
      disabled: isMatched,
      onClick: () => !isMatched && setSelL(it.id),
      style: {
        width: "100%",
        textAlign: "left",
        padding: "9px 10px",
        marginBottom: 6,
        borderRadius: 4,
        border: `1px solid ${border}`,
        background: "transparent",
        color,        fontSize: 12.5,
        opacity: isMatched ? 0.4 : 1
      }
    }, it.label);
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, right.map(it => {
    const isMatched = matched.includes(it.id);
    const isSel = selR === it.id;
    const isFlash = flash && flash.r === it.id;
    let border = C.line,
      color = C.marble;
    if (isMatched) {
      border = C.verdigris;
      color = C.verdigris;
    } else if (isFlash) {
      border = flash.ok ? C.verdigris : C.terracotta;
      color = flash.ok ? "#8FB09E" : C.terracotta;
    } else if (isSel) {
      border = C.bronzeLight;
    }
    return /*#__PURE__*/React.createElement("button", {
      key: it.id,
      disabled: isMatched,
      onClick: () => !isMatched && setSelR(it.id),
      style: {
        width: "100%",
        textAlign: "left",
        padding: "9px 10px",
        marginBottom: 6,
        borderRadius: 4,
        border: `1px solid ${border}`,
        background: "transparent",
        color,
        fontSize: 12.5,
        opacity: isMatched ? 0.4 : 1
      }
    }, it.label);
  })))), done && /*#__PURE__*/React.createElement("button", {
    onClick: finish,
    style: primaryBtn(C.bronze)
  }, "Siguiente ", /*#__PURE__*/React.createElement(ChevronRight, {
    size: 18
  })));
}

/* ---------- 16-17: traduccion escrita (gramatica, ES->EN) ---------- */
function TranslateGramStage({
  items,
  bridge,
  onMark,
  onDone
}) {
  const [idx, setIdx] = useState(0);
  const item = items[idx];
  const [text, setText] = useState("");
  const [checked, setChecked] = useState(null); // {correct}
  useEffect(() => {
    setText("");
    setChecked(null);
  }, [idx]);
  if (!item) {
    onDone();
    return null;
  }
  function check() {
    const correct = normalizeAnswer(text) === normalizeAnswer(item.en);
    setChecked({
      correct
    });
  }
  function next() {
    onMark(item, checked.correct);
    if (idx + 1 < items.length) setIdx(idx + 1);else onDone();
  }
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marbleDim,
      fontSize: 11,
      marginBottom: 6
    }
  }, "PASO 16-17 · TRADUCE (ESCRIBE) · ", idx + 1, "/", items.length), /*#__PURE__*/React.createElement("div", {
    style: cardStyle
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marbleDim,
      fontSize: 11,
      marginBottom: 8,
      letterSpacing: 0.5
    }
  }, "ESPAÑOL"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: serif,
      color: C.marble,
      fontSize: 18,
      marginBottom: 16
    }
  }, item.es), /*#__PURE__*/React.createElement("input", {
    value: text,
    onChange: e => setText(e.target.value),
    disabled: !!checked,
    placeholder: "Escribe tu respuesta en inglés...",
    style: {
      width: "100%",
      background: C.bg,
      border: `1px solid ${checked ? checked.correct ? C.verdigris : C.terracotta : C.line}`,
      borderRadius: 4,
      color: C.marble,
      padding: 10,
      fontSize: 14,
      fontFamily: sans
    }
  }), checked && !checked.correct && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      color: C.marbleDim,
      fontSize: 12.5
    }
  }, "Respuesta correcta: ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#8FB09E",
      fontStyle: "italic"
    }
  }, item.en))), !checked ? /*#__PURE__*/React.createElement("button", {
    onClick: check,
    disabled: !text.trim(),
    style: {
      ...primaryBtn(C.bronze),
      opacity: text.trim() ? 1 : 0.4
    }
  }, "Comprobar") : /*#__PURE__*/React.createElement("button", {
    onClick: next,
    style: primaryBtn(checked.correct ? C.verdigris : C.terracotta)
  }, "Siguiente ", /*#__PURE__*/React.createElement(ChevronRight, {
    size: 18
  })));
}

/* ---------- 18-19: reconstruccion escrita (banco extra) ---------- */
function TranslateExtraStage({
  items,
  onMark,
  onDone
}) {
  const [idx, setIdx] = useState(0);
  const item = items[idx];
  const gb = useMemo(() => item ? genericBlankTyped(item.phrase) : null, [item && item.id]);
  const [text, setText] = useState("");
  const [checked, setChecked] = useState(null);
  useEffect(() => {
    setText("");
    setChecked(null);
  }, [idx]);
  if (!item) {
    onDone();
    return null;
  }
  if (!gb) {
    if (idx + 1 < items.length) {
      setIdx(idx + 1);
      return null;
    }
    onDone();
    return null;
  }
  function check() {
    const correct = normalizeAnswer(text) === normalizeAnswer(gb.correct);
    setChecked({
      correct
    });
  }
  function next() {
    onMark(null, checked.correct);
    if (idx + 1 < items.length) setIdx(idx + 1);else onDone();
  }
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marbleDim,
      fontSize: 11,
      marginBottom: 6
    }
  }, "PASO 18-19 · COMPLETA ESCRIBIENDO (BANCO) · ", idx + 1, "/", items.length), /*#__PURE__*/React.createElement("div", {
    style: cardStyle
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marbleDim,
      fontSize: 11,
      marginBottom: 8
    }
  }, "ESCRIBE LA PALABRA QUE FALTA"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: serif,
      color: C.gold,
      fontSize: 18,
      fontStyle: "italic",
      marginBottom: 16
    }
  }, gb.blanked), /*#__PURE__*/React.createElement("input", {
    value: text,
    onChange: e => setText(e.target.value),
    disabled: !!checked,
    placeholder: "Escribe la palabra...",
    style: {
      width: "100%",
      background: C.bg,
      border: `1px solid ${checked ? checked.correct ? C.verdigris : C.terracotta : C.line}`,
      borderRadius: 4,
      color: C.marble,
      padding: 10,
      fontSize: 14,
      fontFamily: sans
    }
  }), checked && !checked.correct && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      color: C.marbleDim,
      fontSize: 12.5
    }
  }, "Era: ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#8FB09E",
      fontStyle: "italic"
    }
  }, gb.correct), " — frase completa: ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: C.marble,
      fontStyle: "italic"
    }
  }, item.phrase))), !checked ? /*#__PURE__*/React.createElement("button", {
    onClick: check,
    disabled: !text.trim(),
    style: {
      ...primaryBtn(C.bronze),
      opacity: text.trim() ? 1 : 0.4
    }
  }, "Comprobar") : /*#__PURE__*/React.createElement("button", {
    onClick: next,
    style: primaryBtn(checked.correct ? C.verdigris : C.terracotta)
  }, "Siguiente ", /*#__PURE__*/React.createElement(ChevronRight, {
    size: 18
  })));
}

/* ---------- 20: frase propia ---------- */
function FreeStage({
  seed,
  freeInputs,
  setFreeInputs,
  onDone
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marbleDim,
      fontSize: 11,
      marginBottom: 6
    }
  }, "PASO 20 · CREA TU PROPIA FRASE"), /*#__PURE__*/React.createElement("div", {
    style: cardStyle
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marbleDim,
      fontSize: 11,
      marginBottom: 8
    }
  }, "FRASE SEMILLA"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: serif,
      color: C.bronzeLight,
      fontSize: 17,
      fontStyle: "italic"
    }
  }, seed), /*#__PURE__*/React.createElement("button", {
    onClick: () => speak(seed),
    style: iconBtn
  }, /*#__PURE__*/React.createElement(Volume2, {
    size: 15,
    color: C.bronzeLight
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marbleDim,
      fontSize: 12,
      margin: "16px 0 8px"
    }
  }, "Escribe 2 frases propias, inspiradas en la de arriba:"), [0, 1].map(i => /*#__PURE__*/React.createElement("textarea", {
    key: i,
    value: freeInputs[i],
    onChange: e => {
      const arr = [...freeInputs];
      arr[i] = e.target.value;
      setFreeInputs(arr);
    },
    placeholder: `Frase propia ${i + 1}...`,
    rows: 2,
    style: {
      width: "100%",
      background: C.bgSoft,
      border: `1px solid ${C.line}`,
      borderRadius: 4,
      color: C.marble,
      padding: 10,
      fontSize: 14,
      fontFamily: sans,
      marginBottom: 10,
      resize: "vertical"
    }
  })), /*#__PURE__*/React.createElement("button", {
    onClick: onDone,
    disabled: !freeInputs[0].trim() || !freeInputs[1].trim(),
    style: {
      ...primaryBtn(C.bronze),
      opacity: !freeInputs[0].trim() || !freeInputs[1].trim() ? 0.4 : 1
    }
  }, "Terminar día ", /*#__PURE__*/React.createElement(ChevronRight, {
    size: 18
  })));
}

/* ---------- examen ---------- */
function ExamBlock({
  examState,
  onExamPick,
  onExamNext
}) {
  if (!examState || !examState.items.length) return null;
  const item = examState.items[examState.idx];
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marbleDim,
      fontSize: 12,
      marginBottom: 4
    }
  }, "Pregunta ", examState.idx + 1, " / ", examState.items.length, " · aciertos: ", examState.score), /*#__PURE__*/React.createElement(ProgressBar, {
    current: examState.idx + 1,
    total: examState.items.length,
    color: C.terracotta
  }), /*#__PURE__*/React.createElement("div", {
    style: cardStyle
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marbleDim,
      fontSize: 11,
      marginBottom: 8
    }
  }, "TRADUCE AL INGLÉS"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: serif,
      color: C.marble,
      fontSize: 18
    }
  }, item.es)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, examState.options.map((opt, i) => {
    let border = C.line,
      color = C.marble;
    if (examState.answered) {
      if (opt === item.en) {
        border = C.verdigris;
        color = "#8FB09E";
      } else if (opt === examState.answered.picked) {
        border = C.terracotta;
        color = C.terracotta;
      }
    }
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      disabled: !!examState.answered,
      onClick: () => onExamPick(opt),
      style: {
        textAlign: "left",
        padding: "12px 14px",
        borderRadius: 4,
        border: `1px solid ${border}`,
        background: "transparent",
        color,
        fontSize: 14
      }
    }, opt);
  })), examState.answered && /*#__PURE__*/React.createElement("button", {
    onClick: onExamNext,
    style: primaryBtn(C.bronze)
  }, examState.idx + 1 < examState.items.length ? "Siguiente" : "Ver resultado", " ", /*#__PURE__*/React.createElement(ChevronRight, {
    size: 18
  })));
}

/* ===================== DONE / PROGRESS ===================== */
function DoneView({
  isExam,
  results,
  examState,
  effectiveness,
  passed,
  ringSpin,
  reviewMode,
  onComplete,
  onRepeat,
  onBackHome
}) {
  const pct = Math.round(effectiveness * 100);
  const needed = Math.round(EFFECTIVENESS_THRESHOLD * 100);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      paddingTop: 20
    }
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 26,
    color: passed ? C.bronzeLight : C.terracotta,
    style: {
      marginBottom: 10
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: serif,
      color: C.marble,
      fontSize: 22,
      marginBottom: 6
    }
  }, reviewMode ? "Repaso terminado" : isExam ? "Examen terminado" : "Sesión terminada"), isExam ? /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marbleDim,
      fontSize: 14,
      marginBottom: 6
    }
  }, examState.score, " de ", examState.items.length, " correctas") : /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marbleDim,
      fontSize: 14,
      marginBottom: 6
    }
  }, results.correct, " lograste · ", results.wrong, " se cayeron"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: passed ? "#8FB09E" : C.terracotta,
      fontSize: 15,
      fontFamily: serif,
      marginBottom: 24
    }
  }, "Efectividad: ", pct, "%"), reviewMode ? /*#__PURE__*/React.createElement("button", {
    onClick: onBackHome,
    style: primaryBtn(C.bronze)
  }, "Volver al inicio ", /*#__PURE__*/React.createElement(ChevronRight, {
    size: 18
  })) : passed ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    onClick: onComplete,
    style: {
      width: 96,
      height: 96,
      borderRadius: "50%",
      border: `2px solid ${C.bronzeLight}`,
      margin: "0 auto 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      transform: ringSpin ? "rotate(360deg)" : "rotate(0deg)",
      transition: "transform 0.9s ease"
    }
  }, /*#__PURE__*/React.createElement(StoicBust, {
    size: 44
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.bronzeLight,
      fontFamily: serif,
      fontSize: 15,
      fontStyle: "italic"
    }
  }, "Gira el anillo — Stay Stoic")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 96,
      height: 96,
      borderRadius: "50%",
      border: `2px solid ${C.terracotta}`,
      margin: "0 auto 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      opacity: 0.5
    }
  }, /*#__PURE__*/React.createElement(StoicBust, {
    size: 44
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.terracotta,
      fontSize: 13.5,
      marginBottom: 18,
      lineHeight: 1.5
    }
  }, "No alcanzaste el ", needed, "% necesario para avanzar.", /*#__PURE__*/React.createElement("br", null), isExam ? "Repite este mismo examen." : "Repite la sesión de hoy."), /*#__PURE__*/React.createElement("button", {
    onClick: onRepeat,
    style: primaryBtn(C.terracotta)
  }, /*#__PURE__*/React.createElement(RotateCcw, {
    size: 16
  }), " ", isExam ? "Repetir examen" : "Repetir sesión")));
}
function ProgressView({
  meta,
  onBack
}) {
  const b = meta.bridgeErrors;
  const max = Math.max(1, b.be, b.have, b.been, b.modal);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    style: ghostBtn
  }, /*#__PURE__*/React.createElement(HomeIcon, {
    size: 13
  }), " Volver"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marbleDim,
      fontSize: 12,
      marginBottom: 10
    }
  }, "PUENTES QUE MÁS SE CAEN"), /*#__PURE__*/React.createElement(BarRow, {
    label: "be (Futuro Continuo)",
    value: b.be,
    max: max
  }), /*#__PURE__*/React.createElement(BarRow, {
    label: "have (Perfectos)",
    value: b.have,
    max: max
  }), /*#__PURE__*/React.createElement(BarRow, {
    label: "been (Perfectos Continuos)",
    value: b.been,
    max: max
  }), /*#__PURE__*/React.createElement(BarRow, {
    label: "modales + have",
    value: b.modal,
    max: max
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 26
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marbleDim,
      fontSize: 12,
      marginBottom: 10
    }
  }, "HISTORIAL DE EXÁMENES"), meta.examHistory.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.marbleDim,
      fontSize: 13
    }
  }, "Todavía no has hecho ningún examen."), meta.examHistory.slice().reverse().map((e, i) => /*#__PURE__*/React.createElement(Row, {
    key: i,
    label: `Día ${e.day}`,
    value: `${e.score}/${e.total}`
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 26,
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Award, {
    size: 16,
    color: C.bronzeLight
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: C.marble,
      fontSize: 13
    }
  }, "Racha más larga: ", meta.streak, " días")));
}
function BarRow({
  label,
  value,
  max
}) {
  const pct = Math.round(value / max * 100);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 12.5,
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: C.marbleDim
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      color: C.marble
    }
  }, value)), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 6,
      background: C.bgSoft,
      borderRadius: 3
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 6,
      width: `${pct}%`,
      background: C.terracotta,
      borderRadius: 3,
      transition: "width 0.4s"
    }
  })));
}
function ProgressBar({
  current,
  total,
  color = C.bronze
}) {
  const pct = Math.round(current / total * 100);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 4,
      background: C.bgSoft,
      borderRadius: 2,
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 4,
      width: `${pct}%`,
      background: color,
      borderRadius: 2,
      transition: "width 0.3s"
    }
  }));
}

/* ===================== ESTILOS ===================== */
const cardStyle = {
  background: C.bgSoft,
  border: `1px solid ${C.line}`,
  borderRadius: 16,
  padding: "20px 18px",
  marginBottom: 14,
  boxShadow: "0 12px 30px rgba(0,0,0,0.18)"
};
function primaryBtn(bg) {
  return {
    width: "100%",
    padding: "16px 18px",
    minHeight: 52,
    background: bg,
    color: C.marble,
    border: "none",
    borderRadius: 12,
    fontSize: 16,
    fontFamily: sans,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    cursor: "pointer",
    marginTop: 8
  };
}
const ghostBtn = {
  background: "transparent",
  border: `1px solid ${C.line}`,
  color: C.marbleDim,
  borderRadius: 10,
  padding: "10px 14px",
  minHeight: 42,
  fontSize: 12,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  cursor: "pointer",
  fontFamily: sans
};
const iconBtn = {
  background: "transparent",
  border: `1px solid ${C.line}`,
  color: C.bronzeLight,
  borderRadius: 10,
  cursor: "pointer",
  padding: 8,
  minWidth: 38,
  minHeight: 38,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center"
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(React.createElement(StayStoicApp));