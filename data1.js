const { useState, useEffect, useMemo } = React;

/* ===================== ICONOS PROPIOS (reemplazo de lucide-react para CDN suelto) ===================== */
function Icon({
  children,
  size = 16,
  color = "currentColor"
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, children);
}
function Flame(p) {
  return /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("path", {
    d: "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
  }));
}
function Volume2(p) {
  return /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("polygon", {
    points: "11 5 6 9 2 9 2 15 6 15 11 19 11 5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"
  }));
}
function Check(p) {
  return /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("polyline", {
    points: "20 6 9 17 4 12"
  }));
}
function X(p) {
  return /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("line", {
    x1: "18",
    y1: "6",
    x2: "6",
    y2: "18"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "6",
    y1: "6",
    x2: "18",
    y2: "18"
  }));
}
function ChevronRight(p) {
  return /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("polyline", {
    points: "9 18 15 12 9 6"
  }));
}
function ChevronLeft(p) {
  return /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("polyline", {
    points: "15 18 9 12 15 6"
  }));
}
function RotateCcw(p) {
  return /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("polyline", {
    points: "1 4 1 10 7 10"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3.51 15a9 9 0 1 0 2.13-9.36L1 10"
  }));
}
function Award(p) {
  return /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "8",
    r: "7"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "8.21 13.89 7 23 12 20 17 23 15.79 13.88"
  }));
}
function HomeIcon(p) {
  return /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("path", {
    d: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "9 22 9 12 15 12 15 22"
  }));
}
function Sparkles(p) {
  return /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("path", {
    d: "M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3z"
  }));
}
function Lock(p) {
  return /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "11",
    width: "18",
    height: "11",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M7 11V7a5 5 0 0 1 10 0v4"
  }));
}
function Calendar(p) {
  return /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "4",
    width: "18",
    height: "18",
    rx: "2"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "16",
    y1: "2",
    x2: "16",
    y2: "6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "8",
    y1: "2",
    x2: "8",
    y2: "6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "3",
    y1: "10",
    x2: "21",
    y2: "10"
  }));
}

/* ===================== PALETA ===================== */
const C = {
  bg: "#1C1B18",
  bgSoft: "#242320",
  marble: "#EDE6D6",
  marbleDim: "#B8AF9C",
  bronze: "#8A6D3B",
  bronzeLight: "#C9A768",
  gold: "#D9B24C",
  verdigris: "#4A5D52",
  terracotta: "#7A2E2E",
  line: "#3A3730"
};
const serif = "Georgia, 'Times New Roman', serif";
const sans = "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
const EFFECTIVENESS_THRESHOLD = 0.85;
const INTERVALS = [1, 2, 4, 7, 14, 30];
const TOTAL_DAYS = 150;

// ===================== CURRICULO DE 21 SEMANAS (150 dias) =====================
// Cada semana: vocab (5), structures (3 frases modelo), ancla, pool (8 pares ES/EN)
// bridge: 'be' | 'have' | 'been' | 'modal' | 'mixed' | null

// ===================== CURRICULO DE 21 SEMANAS (150 dias) =====================
// Cada semana: vocab (5), structures (3 frases modelo), ancla, pool (8 pares ES/EN)
// bridge: 'be' | 'have' | 'been' | 'modal' | 'mixed' | null

const WEEKS_A = [{
  id: 1,
  range: [1, 7],
  title: "Futuro Continuo",
  bridge: "be",
  priority: 3,
  vocab: [["to endure", "soportar, aguantar"], ["resilience", "resiliencia"], ["setback", "contratiempo"], ["to brace yourself for", "prepararte para"], ["to let go", "soltar"]],
  structures: ["At this time tomorrow, I will be facing the same problem.", "She'll be dealing with it her own way.", "We won't be worrying about things we can't control."],
  structBank: [
    ["Yo estaré enfrentando el mismo problema.", "I'll be facing the same problem."],
    ["Yo estaré trabajando tarde esta noche.", "I'll be working late tonight."],
    ["Yo estaré viajando la próxima semana.", "I'll be traveling next week."],

    ["Mañana estaré soportando otra jornada difícil.", "Tomorrow I'll be enduring another difficult day."],
    ["Ella estará dejando ir lo que ya no puede controlar.", "She'll be letting go of what she can no longer control."],
    ["Nos estaremos preparando para otro contratiempo.", "We'll be bracing ourselves for another setback."],

    ["Él estará reconstruyendo su resiliencia después de este golpe.", "He'll be rebuilding his resilience after this setback."],
    ["A esta hora mañana, estaré aguantando la presión con calma.", "At this time tomorrow, I'll be enduring the pressure calmly."],
    ["No estaremos aferrándonos a errores que ya pasaron.", "We won't be holding on to mistakes that are already behind us."],

    ["Ella estará preparándose para una conversación difícil.", "She'll be bracing herself for a difficult conversation."],
    ["Ellos estarán aprendiendo a dejar ir el resultado.", "They'll be learning to let go of the outcome."],
    ["Yo estaré usando cada contratiempo para fortalecer mi resiliencia.", "I'll be using every setback to strengthen my resilience."],

    ["Esta noche no estaré huyendo del problema.", "Tonight I won't be running away from the problem."],
    ["Pronto estaremos soportando mejor la incertidumbre.", "Soon we'll be enduring uncertainty better."],
    ["Él estará convirtiendo ese contratiempo en una lección.", "He'll be turning that setback into a lesson."],

    ["Ellos estarán preparándose para lo inesperado.", "They'll be bracing themselves for the unexpected."],
    ["Yo estaré dejando ir esa frustración antes de dormir.", "I'll be letting go of that frustration before I go to sleep."],
    ["Ella estará mostrando resiliencia cuando las cosas se compliquen.", "She'll be showing resilience when things get difficult."],

    ["La próxima semana estaremos aprendiendo a soportar mejor la presión.", "Next week we'll be learning to endure pressure better."],
    ["Él no estará dejando que un contratiempo defina su progreso.", "He won't be letting one setback define his progress."],
    ["Yo estaré preparándome para lo que venga, sin perder la calma.", "I'll be bracing myself for whatever comes without losing my calm."]
  ],
  ancla: "I'll be handling it, one step at a time.",
  pool: [["Esta noche estaré trabajando tarde otra vez.", "I'll be working late again tonight."], ["Él no estará pensando en eso mañana.", "He won't be thinking about it tomorrow."], ["A esta hora la próxima semana, estaré viajando.", "This time next week, I'll be traveling."], ["Ellos estarán esperando afuera.", "They'll be waiting outside."], ["No estaremos discutiendo por tonterías.", "We won't be arguing over little things."], ["Ella no estará esperando disculpas.", "She won't be expecting an apology."], ["Estaremos enfrentando decisiones difíciles pronto.", "We'll be facing tough decisions soon."], ["¿Vas a estar trabajando el sábado?", "Will you be working on Saturday?"]]
}, {
  id: 2,
  range: [8, 14],
  title: "Present Perfect",
  bridge: "have",
  priority: 2,
  vocab: [["to accept", "aceptar"], ["to overcome", "superar"], ["adversity", "adversidad"], ["to reflect on", "reflexionar sobre"], ["to let it slide", "dejarlo pasar"]],
  structures: ["I have already accepted it.", "She has never done that before.", "We've been here since morning."],
  structBank: [["Yo ya he aceptado el resultado.", "I've accepted the outcome."], ["Yo ya he superado esa adversidad.", "I've overcome that adversity."], ["Yo ya he reflexionado sobre eso.", "I've reflected on it."], ["Tú ya has aceptado el resultado.", "You've accepted the outcome."], ["Tú ya has superado esa adversidad.", "You've overcome that adversity."], ["Tú ya has reflexionado sobre eso.", "You've reflected on it."], ["Él ya ha aceptado el resultado.", "He's accepted the outcome."], ["Él ya ha superado esa adversidad.", "He's overcome that adversity."], ["Él ya ha reflexionado sobre eso.", "He's reflected on it."], ["Ella ya ha aceptado el resultado.", "She's accepted the outcome."], ["Ella ya ha superado esa adversidad.", "She's overcome that adversity."], ["Ella ya ha reflexionado sobre eso.", "She's reflected on it."], ["Nosotros ya hemos aceptado el resultado.", "We've accepted the outcome."], ["Nosotros ya hemos superado esa adversidad.", "We've overcome that adversity."], ["Nosotros ya hemos reflexionado sobre eso.", "We've reflected on it."], ["Ellos ya han aceptado el resultado.", "They've accepted the outcome."], ["Ellos ya han superado esa adversidad.", "They've overcome that adversity."], ["Ellos ya han reflexionado sobre eso.", "They've reflected on it."], ["Mi hermano ya ha aceptado el resultado.", "My brother has accepted the outcome."], ["Mi hermano ya ha superado esa adversidad.", "My brother has overcome that adversity."], ["Mi hermano ya ha reflexionado sobre eso.", "My brother has reflected on it."]],
  ancla: "I've already made peace with it.",
  pool: [["Ya hice las paces con eso.", "I've already made peace with it."], ["Ella ya ha aceptado el resultado.", "She's already accepted the outcome."], ["No he terminado todavía.", "I haven't finished yet."], ["Hemos estado aquí antes.", "We've been here before."], ["¿Ya has comido?", "Have you eaten yet?"], ["Él nunca ha dicho eso.", "He's never said that."], ["Él ya ha superado eso.", "He's already overcome that."], ["No hemos hablado de eso todavía.", "We haven't talked about that yet."]]
}, {
  id: 3,
  range: [15, 21],
  title: "Past Perfect",
  bridge: "have",
  priority: 2,
  vocab: [["turning point", "punto de inflexión"], ["to come to terms with", "hacer las paces con"], ["to dwell on", "darle vueltas a"], ["in hindsight", "en retrospectiva"], ["looking back", "mirando atrás"]],
  structures: ["I had already left when she called.", "He'd finished before I arrived.", "We hadn't expected that."],
  structBank: [["Yo ya había decidido antes de hablar.", "I'd decided before they talked."], ["Yo ya había salido cuando llegaron.", "I'd left when they arrived."], ["Yo ya había cruzado esa línea antes.", "I'd crossed that line before."], ["Tú ya habías decidido antes de hablar.", "You'd decided before they talked."], ["Tú ya habías salido cuando llegaron.", "You'd left when they arrived."], ["Tú ya habías cruzado esa línea antes.", "You'd crossed that line before."], ["Él ya había decidido antes de hablar.", "He'd decided before they talked."], ["Él ya había salido cuando llegaron.", "He'd left when they arrived."], ["Él ya había cruzado esa línea antes.", "He'd crossed that line before."], ["Ella ya había decidido antes de hablar.", "She'd decided before they talked."], ["Ella ya había salido cuando llegaron.", "She'd left when they arrived."], ["Ella ya había cruzado esa línea antes.", "She'd crossed that line before."], ["Nosotros ya habíamos decidido antes de hablar.", "We'd decided before they talked."], ["Nosotros ya habíamos salido cuando llegaron.", "We'd left when they arrived."], ["Nosotros ya habíamos cruzado esa línea antes.", "We'd crossed that line before."], ["Ellos ya habían decidido antes de hablar.", "They'd decided before they talked."], ["Ellos ya habían salido cuando llegaron.", "They'd left when they arrived."], ["Ellos ya habían cruzado esa línea antes.", "They'd crossed that line before."], ["Mi hermano ya había decidido antes de hablar.", "My brother had decided before they talked."], ["Mi hermano ya había salido cuando llegaron.", "My brother had left when they arrived."], ["Mi hermano ya había cruzado esa línea antes.", "My brother had crossed that line before."]],
  ancla: "By the time I understood, it had already changed.",
  pool: [["Ya había terminado cuando llegaron.", "I had already finished when they arrived."], ["Ella ya se había ido.", "She'd already left."], ["No habíamos visto nada igual.", "We hadn't seen anything like it."], ["Él había cruzado esa línea antes.", "He'd crossed that line before."], ["Para entonces, ya habíamos decidido.", "By then, we'd already decided."], ["¿Habías estado ahí antes?", "Had you been there before?"], ["Ya habíamos decidido antes de hablar.", "We'd already decided before we talked."], ["Él no había dicho nada hasta ese momento.", "He hadn't said anything until that moment."]]
}, {
  id: 4,
  range: [22, 28],
  title: "Futuro Perfecto",
  bridge: "have",
  priority: 3,
  vocab: [["milestone", "hito"], ["to picture something", "imaginarte algo"], ["to settle down", "asentarte"], ["dichotomy of control", "dicotomía del control"], ["decade", "década"]],
  structures: ["By the end of the day, I will have accepted what I couldn't control.", "She'll have moved on by then.", "We'll have worked this out before Friday."],
  structBank: [["Para entonces, yo habré aceptado lo que no se pudo controlar.", "I'll have accepted what couldn't be controlled."], ["Para entonces, yo habré pasado la página de esto.", "I'll have moved on from this."], ["Para entonces, yo habré superado esa adversidad.", "I'll have overcome that adversity."], ["Para entonces, tú habrás aceptado lo que no se pudo controlar.", "You'll have accepted what couldn't be controlled."], ["Para entonces, tú habrás pasado la página de esto.", "You'll have moved on from this."], ["Para entonces, tú habrás superado esa adversidad.", "You'll have overcome that adversity."], ["Para entonces, él habrá aceptado lo que no se pudo controlar.", "He'll have accepted what couldn't be controlled."], ["Para entonces, él habrá pasado la página de esto.", "He'll have moved on from this."], ["Para entonces, él habrá superado esa adversidad.", "He'll have overcome that adversity."], ["Para entonces, ella habrá aceptado lo que no se pudo controlar.", "She'll have accepted what couldn't be controlled."], ["Para entonces, ella habrá pasado la página de esto.", "She'll have moved on from this."], ["Para entonces, ella habrá superado esa adversidad.", "She'll have overcome that adversity."], ["Para entonces, nosotros habremos aceptado lo que no se pudo controlar.", "We'll have accepted what couldn't be controlled."], ["Para entonces, nosotros habremos pasado la página de esto.", "We'll have moved on from this."], ["Para entonces, nosotros habremos superado esa adversidad.", "We'll have overcome that adversity."], ["Para entonces, ellos habrán aceptado lo que no se pudo controlar.", "They'll have accepted what couldn't be controlled."], ["Para entonces, ellos habrán pasado la página de esto.", "They'll have moved on from this."], ["Para entonces, ellos habrán superado esa adversidad.", "They'll have overcome that adversity."], ["Para entonces, mi hermano habrá aceptado lo que no se pudo controlar.", "My brother will have accepted what couldn't be controlled."], ["Para entonces, mi hermano habrá pasado la página de esto.", "My brother will have moved on from this."], ["Para entonces, mi hermano habrá superado esa adversidad.", "My brother will have overcome that adversity."]],
  ancla: "By then, I will have accepted what I couldn't control.",
  pool: [["Para el final del día, ya habré aceptado lo que no pude controlar.", "By the end of the day, I will have accepted what I couldn't control."], ["Ella ya habrá pasado la página para entonces.", "She'll have moved on by then."], ["Para la próxima semana, ya me lo habré sacudido de encima.", "By next week, I'll have shaken it off."], ["Habremos resuelto esto antes del viernes.", "We'll have worked this out before Friday."], ["Él ya habrá superado esa adversidad.", "He'll have overcome that adversity."], ["Para cuando llegues, ya habré reflexionado sobre eso.", "By the time you arrive, I'll have reflected on it."], ["Para el próximo mes, habré aceptado el resultado.", "By next month, I will have accepted the outcome."], ["Para cuando sea viejo, habré construido la vida que siempre imaginé.", "By the time I'm old, I will have built the life I always pictured."]]
}, {
  id: 5,
  range: [29, 35],
  title: "Present Perfect Continuous",
  bridge: "been",
  priority: 2,
  vocab: [["consistency", "constancia"], ["to cultivate a habit", "cultivar un hábito"], ["self-mastery", "autodominio"], ["journey", "camino"], ["to struggle with", "luchar con"]],
  structures: ["I've been working on this for weeks.", "She's been trying her best.", "We've been improving little by little."],
  structBank: [["Yo he estado pensando en eso todo el día.", "I've been thinking about it all day."], ["Yo he estado trabajando en esto por horas.", "I've been working on this for hours."], ["Yo he estado evitando el tema.", "I've been avoiding the topic."], ["Tú has estado pensando en eso todo el día.", "You've been thinking about it all day."], ["Tú has estado trabajando en esto por horas.", "You've been working on this for hours."], ["Tú has estado evitando el tema.", "You've been avoiding the topic."], ["Él ha estado pensando en eso todo el día.", "He's been thinking about it all day."], ["Él ha estado trabajando en esto por horas.", "He's been working on this for hours."], ["Él ha estado evitando el tema.", "He's been avoiding the topic."], ["Ella ha estado pensando en eso todo el día.", "She's been thinking about it all day."], ["Ella ha estado trabajando en esto por horas.", "She's been working on this for hours."], ["Ella ha estado evitando el tema.", "She's been avoiding the topic."], ["Nosotros hemos estado pensando en eso todo el día.", "We've been thinking about it all day."], ["Nosotros hemos estado trabajando en esto por horas.", "We've been working on this for hours."], ["Nosotros hemos estado evitando el tema.", "We've been avoiding the topic."], ["Ellos han estado pensando en eso todo el día.", "They've been thinking about it all day."], ["Ellos han estado trabajando en esto por horas.", "They've been working on this for hours."], ["Ellos han estado evitando el tema.", "They've been avoiding the topic."], ["Mi hermano ha estado pensando en eso todo el día.", "My brother has been thinking about it all day."], ["Mi hermano ha estado trabajando en esto por horas.", "My brother has been working on this for hours."], ["Mi hermano ha estado evitando el tema.", "My brother has been avoiding the topic."]],
  ancla: "I've been building this, little by little.",
  pool: [["He estado pensando en eso todo el día.", "I've been thinking about it all day."], ["Ella ha estado esperando pacientemente.", "She's been waiting patiently."], ["Hemos estado trabajando en esto por horas.", "We've been working on this for hours."], ["No he estado durmiendo bien.", "I haven't been sleeping well."], ["¿Has estado practicando?", "Have you been practicing?"], ["Él ha estado evitando el tema.", "He's been avoiding the topic."], ["Él ha estado mejorando cada día.", "He's been improving every day."], ["No he estado descansando lo suficiente.", "I haven't been resting enough."]]
}, {
  id: 6,
  range: [36, 42],
  title: "Past Perfect Continuous",
  bridge: "been",
  priority: 3,
  vocab: [["burnout", "agotamiento extremo"], ["to spiral out of control", "descontrolarse"], ["to hold it together", "mantenerse entero"], ["rough patch", "mal momento"], ["to beat yourself up", "castigarte"]],
  structures: ["I had been struggling with anger before I discovered Stoicism.", "She'd been holding it together.", "We'd been going through a rough patch."],
  structBank: [["Yo había estado luchando con la ira por meses.", "I'd been struggling with anger for months."], ["Yo había estado cargando ese peso solo.", "I'd been carrying that weight alone."], ["Yo había estado evitando el problema.", "I'd been avoiding the problem."], ["Tú habías estado luchando con la ira por meses.", "You'd been struggling with anger for months."], ["Tú habías estado cargando ese peso solo.", "You'd been carrying that weight alone."], ["Tú habías estado evitando el problema.", "You'd been avoiding the problem."], ["Él había estado luchando con la ira por meses.", "He'd been struggling with anger for months."], ["Él había estado cargando ese peso solo.", "He'd been carrying that weight alone."], ["Él había estado evitando el problema.", "He'd been avoiding the problem."], ["Ella había estado luchando con la ira por meses.", "She'd been struggling with anger for months."], ["Ella había estado cargando ese peso solo.", "She'd been carrying that weight alone."], ["Ella había estado evitando el problema.", "She'd been avoiding the problem."], ["Nosotros habíamos estado luchando con la ira por meses.", "We'd been struggling with anger for months."], ["Nosotros habíamos estado cargando ese peso solo.", "We'd been carrying that weight alone."], ["Nosotros habíamos estado evitando el problema.", "We'd been avoiding the problem."], ["Ellos habían estado luchando con la ira por meses.", "They'd been struggling with anger for months."], ["Ellos habían estado cargando ese peso solo.", "They'd been carrying that weight alone."], ["Ellos habían estado evitando el problema.", "They'd been avoiding the problem."], ["Mi hermano había estado luchando con la ira por meses.", "My brother had been struggling with anger for months."], ["Mi hermano había estado cargando ese peso solo.", "My brother had been carrying that weight alone."], ["Mi hermano había estado evitando el problema.", "My brother had been avoiding the problem."]],
  ancla: "I'd been losing my cool for weeks — not anymore.",
  pool: [["Había estado luchando contra la ira durante meses.", "I had been struggling with anger for months."], ["Él se había estado castigando por eso.", "He'd been beating himself up over it."], ["Habíamos estado pasando por un mal momento.", "We'd been going through a rough patch."], ["Ella se había estado manteniendo entera.", "She'd been holding it together."], ["Yo había estado evitando el problema.", "I'd been avoiding the problem."], ["Le había estado dando vueltas en mi cabeza por horas.", "I'd been going back and forth in my head for hours."], ["Habían estado descontrolándose poco a poco.", "They'd been spiraling out of control for weeks."], ["Él había estado cargando ese peso solo.", "He'd been carrying that weight alone."]]
}, {
  id: 7,
  range: [43, 49],
  title: "Futuro Perfecto Continuo",
  bridge: "been",
  priority: 3,
  vocab: [["to grind away", "dedicarle esfuerzo constante"], ["non-stop", "sin parar"], ["to chase consistency", "perseguir la constancia"], ["to build something", "construir algo"], ["decade", "década"]],
  structures: ["By the time I turn 40, I will have been practicing this for a decade.", "We'll have been putting up with a lot by then.", "By June, she'll have been working on it non-stop."],
  structBank: [["Para entonces, yo habré estado practicando esto por una década.", "I'll have been practicing this for a decade."], ["Para entonces, yo habré estado construyendo esto por años.", "I'll have been building this for years."], ["Para entonces, yo habré estado persiguiendo la constancia todo el año.", "I'll have been chasing consistency all year."], ["Para entonces, tú habrás estado practicando esto por una década.", "You'll have been practicing this for a decade."], ["Para entonces, tú habrás estado construyendo esto por años.", "You'll have been building this for years."], ["Para entonces, tú habrás estado persiguiendo la constancia todo el año.", "You'll have been chasing consistency all year."], ["Para entonces, él habrá estado practicando esto por una década.", "He'll have been practicing this for a decade."], ["Para entonces, él habrá estado construyendo esto por años.", "He'll have been building this for years."], ["Para entonces, él habrá estado persiguiendo la constancia todo el año.", "He'll have been chasing consistency all year."], ["Para entonces, ella habrá estado practicando esto por una década.", "She'll have been practicing this for a decade."], ["Para entonces, ella habrá estado construyendo esto por años.", "She'll have been building this for years."], ["Para entonces, ella habrá estado persiguiendo la constancia todo el año.", "She'll have been chasing consistency all year."], ["Para entonces, nosotros habremos estado practicando esto por una década.", "We'll have been practicing this for a decade."], ["Para entonces, nosotros habremos estado construyendo esto por años.", "We'll have been building this for years."], ["Para entonces, nosotros habremos estado persiguiendo la constancia todo el año.", "We'll have been chasing consistency all year."], ["Para entonces, ellos habrán estado practicando esto por una década.", "They'll have been practicing this for a decade."], ["Para entonces, ellos habrán estado construyendo esto por años.", "They'll have been building this for years."], ["Para entonces, ellos habrán estado persiguiendo la constancia todo el año.", "They'll have been chasing consistency all year."], ["Para entonces, mi hermano habrá estado practicando esto por una década.", "My brother will have been practicing this for a decade."], ["Para entonces, mi hermano habrá estado construyendo esto por años.", "My brother will have been building this for years."], ["Para entonces, mi hermano habrá estado persiguiendo la constancia todo el año.", "My brother will have been chasing consistency all year."]],
  ancla: "By then, I'll have been building this for years.",
  pool: [["Para cuando cumpla 40, habré estado practicando esto por una década.", "By the time I turn 40, I will have been practicing this for a decade."], ["Habremos estado aguantando mucho para entonces.", "We'll have been putting up with a lot by then."], ["Para junio, ella habrá estado trabajando en eso sin parar.", "By June, she'll have been working on it non-stop."], ["Habré estado dándole duro a esto por años.", "I'll have been grinding away at this for years."], ["Él habrá estado cultivando ese hábito por meses.", "He'll have been cultivating that habit for months."], ["Para entonces, habremos estado construyendo esto juntos.", "By then, we'll have been building this together."], ["Habré estado en ese camino por mucho tiempo.", "I'll have been on that journey for a long time."], ["Ella habrá estado buscando la constancia todo el año.", "She'll have been chasing consistency all year."]]
}, {
  id: 8,
  range: [50, 56],
  title: "Modal: can't have / could've",
  bridge: "modal",
  priority: 3,
  vocab: [["outcome", "resultado"], ["reaction", "reacción"], ["self-control", "autocontrol"], ["to withstand", "resistir"], ["to snap at", "explotar con"]],
  structures: ["That can't have been easy.", "I could've lost it right there.", "She could've handled that better."],
  structBank: [["Yo no puedo haber querido decir eso en serio.", "I can't have meant that seriously."], ["Yo no puedo haber sabido toda la verdad.", "I can't have known the whole truth."], ["Yo no puedo haber hecho eso a propósito.", "I can't have done it on purpose."], ["Tú no puedes haber querido decir eso en serio.", "You can't have meant that seriously."], ["Tú no puedes haber sabido toda la verdad.", "You can't have known the whole truth."], ["Tú no puedes haber hecho eso a propósito.", "You can't have done it on purpose."], ["Él no puede haber querido decir eso en serio.", "He can't have meant that seriously."], ["Él no puede haber sabido toda la verdad.", "He can't have known the whole truth."], ["Él no puede haber hecho eso a propósito.", "He can't have done it on purpose."], ["Ella no puede haber querido decir eso en serio.", "She can't have meant that seriously."], ["Ella no puede haber sabido toda la verdad.", "She can't have known the whole truth."], ["Ella no puede haber hecho eso a propósito.", "She can't have done it on purpose."], ["Nosotros no podemos haber querido decir eso en serio.", "We can't have meant that seriously."], ["Nosotros no podemos haber sabido toda la verdad.", "We can't have known the whole truth."], ["Nosotros no podemos haber hecho eso a propósito.", "We can't have done it on purpose."], ["Ellos no pueden haber querido decir eso en serio.", "They can't have meant that seriously."], ["Ellos no pueden haber sabido toda la verdad.", "They can't have known the whole truth."], ["Ellos no pueden haber hecho eso a propósito.", "They can't have done it on purpose."], ["Mi hermano no puede haber querido decir eso en serio.", "My brother can't have meant that seriously."], ["Mi hermano no puede haber sabido toda la verdad.", "My brother can't have known the whole truth."], ["Mi hermano no puede haber hecho eso a propósito.", "My brother can't have done it on purpose."]],
  ancla: "I could've reacted badly — I chose not to.",
  pool: [["Eso no puede haber sido fácil.", "That can't have been easy."], ["No puede haberlo dicho en serio.", "He can't have meant it."], ["Me pude haber descontrolado ahí mismo.", "I could've lost it right there."], ["Ella pudo haberlo manejado mejor.", "She could've handled that better."], ["No puede haber sido tan malo.", "It can't have been that bad."], ["Pudimos haber evitado esa discusión.", "We could've avoided that argument."], ["Él no puede haber dicho eso en serio.", "He can't have meant that seriously."], ["Pude haber reaccionado peor.", "I could've reacted worse."]]
}, {
  id: 9,
  range: [57, 63],
  title: "Modal: may have / might've",
  bridge: "modal",
  priority: 2,
  vocab: [["uncertainty", "incertidumbre"], ["deduction", "deducción"], ["possibility", "posibilidad"], ["to overreact", "reaccionar exageradamente"], ["misunderstanding", "malentendido"]],
  structures: ["She may have known.", "He might've overreacted.", "She might not have understood it."],
  structBank: [["Yo puede que no haya entendido la situación.", "I might not have understood the situation."], ["Yo puede que no haya visto el mensaje.", "I might not have seen the message."], ["Yo puede que no haya notado el error.", "I might not have realized the mistake."], ["Tú puede que no haya entendido la situación.", "You might not have understood the situation."], ["Tú puede que no haya visto el mensaje.", "You might not have seen the message."], ["Tú puede que no haya notado el error.", "You might not have realized the mistake."], ["Él puede que no haya entendido la situación.", "He might not have understood the situation."], ["Él puede que no haya visto el mensaje.", "He might not have seen the message."], ["Él puede que no haya notado el error.", "He might not have realized the mistake."], ["Ella puede que no haya entendido la situación.", "She might not have understood the situation."], ["Ella puede que no haya visto el mensaje.", "She might not have seen the message."], ["Ella puede que no haya notado el error.", "She might not have realized the mistake."], ["Nosotros puede que no haya entendido la situación.", "We might not have understood the situation."], ["Nosotros puede que no haya visto el mensaje.", "We might not have seen the message."], ["Nosotros puede que no haya notado el error.", "We might not have realized the mistake."], ["Ellos puede que no haya entendido la situación.", "They might not have understood the situation."], ["Ellos puede que no haya visto el mensaje.", "They might not have seen the message."], ["Ellos puede que no haya notado el error.", "They might not have realized the mistake."], ["Mi hermano puede que no haya entendido la situación.", "My brother might not have understood the situation."], ["Mi hermano puede que no haya visto el mensaje.", "My brother might not have seen the message."], ["Mi hermano puede que no haya notado el error.", "My brother might not have realized the mistake."]],
  ancla: "It might not be easy, but I must accept it.",
  pool: [["Ella puede haberlo sabido.", "She may have known."], ["Puede haber sido un malentendido.", "It may have been a misunderstanding."], ["Puede que él haya reaccionado exageradamente.", "He might've overreacted."], ["Puede que ella no lo haya entendido.", "She might not have understood it."], ["Puede que haya sido un error.", "It may have been a mistake."], ["Puede que ellos no hayan visto el mensaje.", "They might not have seen the message."], ["Puede que ella haya cambiado de opinión.", "She may have changed her mind."], ["Pudo haber sido peor, la verdad.", "It might have been worse, honestly."]]
}, {
  id: 10,
  range: [64, 70],
  title: "Modal: will have been",
  bridge: "modal",
  priority: 3,
  vocab: [["milestone", "hito"], ["decade", "década"], ["non-stop", "sin parar"], ["journey", "camino"], ["to anchor", "anclarse"]],
  structures: ["I'll have been at this for years by then.", "They'll have been waiting a long time.", "She'll have been chasing consistency all year."],
  structBank: [["Para entonces, yo habré estado esperando mucho tiempo.", "I'll have been waiting a long time."], ["Para entonces, yo habré estado ahorrando por meses.", "I'll have been saving up for months."], ["Para entonces, yo habré estado aprendiendo por mucho tiempo.", "I'll have been learning for a long time."], ["Para entonces, tú habrás estado esperando mucho tiempo.", "You'll have been waiting a long time."], ["Para entonces, tú habrás estado ahorrando por meses.", "You'll have been saving up for months."], ["Para entonces, tú habrás estado aprendiendo por mucho tiempo.", "You'll have been learning for a long time."], ["Para entonces, él habrá estado esperando mucho tiempo.", "He'll have been waiting a long time."], ["Para entonces, él habrá estado ahorrando por meses.", "He'll have been saving up for months."], ["Para entonces, él habrá estado aprendiendo por mucho tiempo.", "He'll have been learning for a long time."], ["Para entonces, ella habrá estado esperando mucho tiempo.", "She'll have been waiting a long time."], ["Para entonces, ella habrá estado ahorrando por meses.", "She'll have been saving up for months."], ["Para entonces, ella habrá estado aprendiendo por mucho tiempo.", "She'll have been learning for a long time."], ["Para entonces, nosotros habremos estado esperando mucho tiempo.", "We'll have been waiting a long time."], ["Para entonces, nosotros habremos estado ahorrando por meses.", "We'll have been saving up for months."], ["Para entonces, nosotros habremos estado aprendiendo por mucho tiempo.", "We'll have been learning for a long time."], ["Para entonces, ellos habrán estado esperando mucho tiempo.", "They'll have been waiting a long time."], ["Para entonces, ellos habrán estado ahorrando por meses.", "They'll have been saving up for months."], ["Para entonces, ellos habrán estado aprendiendo por mucho tiempo.", "They'll have been learning for a long time."], ["Para entonces, mi hermano habrá estado esperando mucho tiempo.", "My brother will have been waiting a long time."], ["Para entonces, mi hermano habrá estado ahorrando por meses.", "My brother will have been saving up for months."], ["Para entonces, mi hermano habrá estado aprendiendo por mucho tiempo.", "My brother will have been learning for a long time."]],
  ancla: "By then, I'll have been building this for years.",
  pool: [["Habré estado en esto por años para entonces.", "I'll have been at this for years by then."], ["Ellos habrán estado esperando mucho tiempo.", "They'll have been waiting a long time."], ["Para entonces, habré estado construyendo esto por años.", "By then, I'll have been building this for years."], ["Ella habrá estado esperando pacientemente.", "She'll have been waiting patiently."], ["Habremos estado trabajando juntos por una década.", "We'll have been working together for a decade."], ["Él habrá estado ahorrando por meses.", "He'll have been saving up for months."], ["Para el próximo año, habré estado aprendiendo inglés por mucho tiempo.", "By next year, I'll have been learning English for a long time."], ["Habrán estado viviendo ahí por años.", "They'll have been living there for years."]]
}];