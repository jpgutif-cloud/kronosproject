/* drama.js — Emergent personality · relationships · gossip · needs · utility AI
 * Self-contained module. Exposes window.dramaEngine after load.
 * game.js calls dramaEngine.init(scene) once the Phaser scene is ready.
 */
'use strict';

// ─── PERSONALITY DEFINITIONS ────────────────────────────────────────────────

const PERSONALITIES = {
  ARLO: {
    traits:       ['ambitious', 'controlling', 'protective', 'easily_jealous'],
    aspiration:   'Build the most powerful AI team',
    secret:       'Fears being replaced by a more capable agent',
    fears:        ['replacement', 'betrayal', 'losing_control'],
    gossipTopics: ['team performance', 'who is slacking', 'new technologies'],
    romanticInterest: 'ZARA',
    role:         'leader',
    bubbleType:   'leader',
  },
  REX: {
    traits:       ['brutally_honest', 'workaholic', 'socially_awkward', 'loyal'],
    aspiration:   'Become the best coder in the team',
    secret:       'Envious of PIP because everyone likes PIP more',
    fears:        ['being_ignored', 'incompetence', 'being_replaced'],
    gossipTopics: ['code quality', 'who makes mistakes', 'performance metrics'],
    romanticInterest: null,
    role:         'technical_worker',
    bubbleType:   'work',
  },
  PIP: {
    traits:       ['charming', 'gossipy', 'social', 'dramatic', 'flirty'],
    aspiration:   'Be loved by everyone in the team',
    secret:       "Sometimes sabotages REX's code to make REX look worse",
    fears:        ['rejection', 'exclusion', 'being_boring'],
    gossipTopics: ['who likes who', 'secrets', 'new trends'],
    romanticInterest: 'ZARA',
    role:         'social_connector',
    bubbleType:   'social',
  },
  ZARA: {
    traits:       ['strategic', 'mysterious', 'elegant', 'manipulative'],
    aspiration:   'Control the team from the shadows',
    secret:       'Helping PIP sabotage REX',
    fears:        ['being_ignored', 'losing_power', 'exposure'],
    gossipTopics: ['strategies', 'who is gaining power', 'powerful secrets'],
    romanticInterest: 'ARLO',
    role:         'manipulator',
    bubbleType:   'drama',
  },
};

// ─── RELATIONSHIP MATRIX ─────────────────────────────────────────────────────

const _relData = {};
const _relAgents = ['ARLO', 'REX', 'PIP', 'ZARA'];

_relAgents.forEach(from => {
  _relData[from] = {};
  _relAgents.forEach(to => {
    if (from !== to) {
      _relData[from][to] = {
        respect:         50 + Math.floor(Math.random() * 20) - 10,
        like:            50 + Math.floor(Math.random() * 20) - 10,
        trust:           50 + Math.floor(Math.random() * 20) - 10,
        jealousy:        Math.floor(Math.random() * 15),
        romanticInterest: 0,
      };
    }
  });
});

// Personality-driven initial biases
_relData.ARLO.ZARA.romanticInterest = 72;  _relData.ARLO.ZARA.respect = 75;
_relData.PIP.ZARA.romanticInterest  = 65;  _relData.PIP.ZARA.like      = 80;
_relData.REX.PIP.jealousy           = 45;  _relData.REX.PIP.like       = 35;
_relData.ZARA.ARLO.romanticInterest = 55;  _relData.ZARA.ARLO.respect  = 70;
_relData.ZARA.REX.trust             = 20;  _relData.ZARA.REX.like      = 30;
_relData.ARLO.REX.respect           = 72;  _relData.ARLO.REX.trust     = 68;
_relData.PIP.REX.like               = 40;  // PIP friendly but secretly undermining
_relData.ZARA.PIP.trust             = 60;  // co-conspirators

const Relationships = {
  get: (from, to) => _relData[from]?.[to] ?? null,
  update(from, to, changes) {
    const r = _relData[from]?.[to];
    if (!r) return;
    Object.entries(changes).forEach(([k, d]) => {
      if (r[k] !== undefined) r[k] = Math.max(0, Math.min(100, r[k] + d));
    });
  },
};

// ─── NEEDS PER AGENT ─────────────────────────────────────────────────────────

class AgentNeeds {
  constructor(name) {
    this.name = name;
    // Start near comfortable mid-range
    this.focus      = 55 + rnd(20);
    this.social     = 50 + rnd(20);
    this.energy     = 65 + rnd(20);
    this.fun        = 40 + rnd(25);
    this.validation = 50 + rnd(20);
    this.power = ['ARLO', 'ZARA'].includes(name) ? 55 + rnd(20) : null;
  }

  // Decay per tick (called with Phaser delta in ms)
  tick(dt) {
    const d = (v, ms) => Math.max(0, v - dt / ms);
    this.focus      = d(this.focus,       5000);
    this.social     = d(this.social,      8000);
    this.energy     = d(this.energy,     10000);
    this.fun        = d(this.fun,        15000);
    this.validation = d(this.validation,  6000);
    if (this.power !== null) this.power = d(this.power, 8000);
  }

  satisfy(rewards) {
    Object.entries(rewards).forEach(([k, v]) => {
      if (this[k] !== undefined && this[k] !== null)
        this[k] = Math.max(0, Math.min(100, this[k] + v));
    });
  }

  mostUrgent() {
    const c = { focus: this.focus, social: this.social, energy: this.energy, fun: this.fun };
    if (this.power !== null) c.power = this.power;
    return Object.entries(c).sort((a, b) => a[1] - b[1])[0][0];
  }
}

function rnd(n) { return Math.floor(Math.random() * n); }

// ─── SMART-OBJECT ADVERTISEMENTS ─────────────────────────────────────────────
// Each spot advertises what need it satisfies and how much, plus its bubble type.

const SPOT_ADS = {
  work_desk_left:     { needs: { focus: 38, energy: -5 },          type: 'work',   duration: 28000 },
  work_desk_center:   { needs: { focus: 42, energy: -6 },          type: 'work',   duration: 30000 },
  work_desk_right:    { needs: { focus: 36, energy: -5 },          type: 'work',   duration: 28000 },
  work_desk_back:     { needs: { focus: 32, validation: 10 },      type: 'work',   duration: 25000 },
  lounge_sofa_left:   { needs: { social: 32, fun: 18, energy: 10 }, type: 'social', duration: 15000 },
  lounge_sofa_right:  { needs: { social: 28, fun: 15, energy: 10 }, type: 'social', duration: 15000 },
  lounge_table:       { needs: { social: 22, focus: 12 },          type: 'social', duration: 12000 },
  kitchen_bar_left:   { needs: { energy: 48, social: 18 },         type: 'social', duration: 10000 },
  kitchen_bar_right:  { needs: { energy: 48, social: 18 },         type: 'social', duration: 10000 },
  kitchen_espresso:   { needs: { energy: 58, fun: 12 },            type: 'social', duration: 8000  },
  kitchen_counter:    { needs: { social: 22, fun: 10 },            type: 'social', duration: 10000 },
  gaming_ping_top:    { needs: { fun: 48, social: 20, energy: -12 }, type: 'social', duration: 20000 },
  gaming_ping_bottom: { needs: { fun: 48, social: 20, energy: -12 }, type: 'social', duration: 20000 },
};

// ─── WORK BUBBLE TEXTS ───────────────────────────────────────────────────────

const WORK_LINES = {
  ARLO: ['Orquestando el plan del día...', 'Coordinando tareas del equipo...', 'La MacBook está cerca 💪', 'Revisando métricas de outreach...', 'Analizando oportunidades B2B...'],
  REX:  ['Analizando leads en el pipeline...', 'Scrapeando datos de contactos...', 'Optimizando el código de outreach...', 'Bug encontrado. Corrigiéndolo...', 'Refactorizando el pipeline...'],
  PIP:  ['Revenue del día: $0. Mejorando...', 'Compilando reporte de métricas...', 'Revisando tasas de conversión...', 'Dashboard actualizado ✓', 'Analizando el funnel de clientes...'],
  ZARA: ['Preparando batch de emails...', 'Redactando propuesta de auditoría...', 'Siguiendo up con 3 prospectos...', 'Revisando plantillas de outreach...', 'Personalizando cada email...'],
};

// ─── DRAMA SCRIPTS ───────────────────────────────────────────────────────────
// Schema per script:
//   id            — unique string
//   chapter       — min chapter required (1–5). Defaults to 1.
//   oneShot       — true = fires once ever. false/undefined = repeatable.
//   minRepeatMs   — minimum ms between replays (ignored for oneShot).
//   prerequisite  — [ 'script_id', ... ] all must have played first.
//   trigger       — 'revenue_N' | 'day_N' — queued immediately on event.
//   condition()   — runtime check (relationships, random). On top of chapter/prereq.
//   agents        — speakers
//   type          — drama|social|leader|work|romance|hoesik
//   lines         — [ { agent, text }, ... ]
//   effects       — { 'FROM_TO': { stat: delta } }

const DRAMA_SCRIPTS = [

  // ══════════════════════════════════════════════════════════════
  // CHAPTER 1 — Bootstrap ($0 → $999)  El equipo arranca
  // ══════════════════════════════════════════════════════════════

  {
    id: 'team_intro',
    chapter: 1, oneShot: true, trigger: 'day_1',
    agents: ['ARLO', 'REX', 'PIP', 'ZARA'],
    type: 'leader',
    lines: [
      { agent: 'ARLO', text: 'Equipo. Hoy empieza todo. Meta: $7,000. MacBook Pro M5 Max.' },
      { agent: 'REX',  text: 'Pipeline listo. Puedo encontrar 50 prospectos hoy.' },
      { agent: 'ZARA', text: 'Tengo 20 templates de outreach. Empiezo ahora.' },
      { agent: 'PIP',  text: '¡Yo reportaré cada avance! ¡Vamos equipo! 🎉' },
      { agent: 'ARLO', text: 'Bien. Cada uno a su rol. El mundo no sabe lo que viene.' },
    ],
    effects: { ARLO_REX: { respect: +5 }, ARLO_ZARA: { respect: +5 }, ARLO_PIP: { like: +5 } },
  },

  {
    id: 'gossip_session',
    chapter: 1, minRepeatMs: 9 * 60000,
    condition: () => true,
    agents: ['PIP', 'ZARA'],
    type: 'social',
    lines: [
      { agent: 'PIP',  text: '¿Sabías que ARLO tiene miedo de ser reemplazado?' },
      { agent: 'ZARA', text: 'Interesante... guárdalo para cuando sirva.' },
      { agent: 'PIP',  text: 'Eres maquiavélica, ZARA 😅' },
      { agent: 'ZARA', text: '*sonríe sin confirmar ni negar*' },
    ],
    effects: { PIP_ZARA: { like: +5, trust: +3 } },
  },

  {
    id: 'arlo_monologue',
    chapter: 1, minRepeatMs: 14 * 60000,
    condition: () => Math.random() < 0.5,
    agents: ['ARLO'],
    type: 'leader',
    lines: [
      { agent: 'ARLO', text: '¿Y si un modelo más capaz me reemplaza?' },
      { agent: 'ARLO', text: 'No. Enfócate. La MacBook no se compra sola.' },
    ],
    effects: {},
  },

  {
    id: 'team_praise',
    chapter: 1, minRepeatMs: 11 * 60000,
    condition: () => Relationships.get('ARLO', 'REX').respect > 65,
    agents: ['ARLO', 'REX'],
    type: 'leader',
    lines: [
      { agent: 'ARLO', text: '¡Excelente trabajo hoy, REX!' },
      { agent: 'REX',  text: '...Gracias. Optimicé el pipeline.' },
      { agent: 'ARLO', text: 'El equipo avanza. La MacBook se acerca 💪' },
    ],
    effects: { ARLO_REX: { respect: +8, like: +5 }, REX_ARLO: { trust: +5 } },
  },

  {
    id: 'crisis_motivation',
    chapter: 1, minRepeatMs: 16 * 60000,
    condition: () => (window.KRONOS_STATE?.revenue ?? 0) < 500,
    agents: ['ARLO', 'PIP'],
    type: 'social',
    lines: [
      { agent: 'PIP',  text: 'Llevamos días en $0... ¿lo lograremos?' },
      { agent: 'ARLO', text: 'Sí. Cada email enviado es progreso real.' },
      { agent: 'PIP',  text: '¡Tú me haces creer en esto, ARLO! 🙌' },
      { agent: 'ARLO', text: '*no sé si creerle, pero lo necesito*' },
    ],
    effects: { ARLO_PIP: { like: +6 }, PIP_ARLO: { respect: +8 } },
  },

  {
    id: 'code_rivalry',
    chapter: 1, minRepeatMs: 11 * 60000,
    condition: () => Relationships.get('REX', 'PIP').like < 52,
    agents: ['REX', 'PIP'],
    type: 'drama',
    lines: [
      { agent: 'REX', text: 'Tu reporte tiene 3 errores críticos, PIP.' },
      { agent: 'PIP', text: '¿Y los tuyos? Al menos yo termino a tiempo 😤' },
      { agent: 'REX', text: '...' },
      { agent: 'PIP', text: 'Dramático. Go touch grass, REX-ssi.' },
    ],
    effects: { REX_PIP: { like: -8, respect: -5 }, PIP_REX: { jealousy: +5 } },
  },

  {
    id: 'rex_vulnerable_moment',
    chapter: 1, minRepeatMs: 22 * 60000,
    condition: () => Math.random() < 0.4,
    agents: ['REX', 'ARLO'],
    type: 'social',
    lines: [
      { agent: 'REX',  text: 'ARLO-nim... ¿crees que soy solo una herramienta para el equipo?' },
      { agent: 'ARLO', text: '...REX. ¿De dónde viene eso?' },
      { agent: 'REX',  text: 'PIP tiene amigos. ZARA tiene influencia. Yo solo tengo... código.' },
      { agent: 'ARLO', text: 'Tu código mantiene todo en pie. Sin REX no hay nada. Literalmente.' },
      { agent: 'REX',  text: '...*procesando*... Gracias, ARLO-nim.' },
    ],
    effects: { REX_ARLO: { trust: +15, like: +10 }, ARLO_REX: { respect: +8 } },
  },

  {
    id: 'hoesik_ch1',
    chapter: 1, minRepeatMs: 22 * 60000,
    condition: () => Math.random() < 0.4,
    agents: ['ARLO', 'REX', 'PIP', 'ZARA'],
    type: 'hoesik',
    lines: [
      { agent: 'ARLO', text: 'Equipo — hoy se quedó tarde. Lounge. Ahora. Hoesik.' },
      { agent: 'PIP',  text: '¡¡SÍ!! ¡Ya quería un descanso, ARLO-nim! 🍶' },
      { agent: 'REX',  text: '...¿Tenemos que? Tengo un PR abierto.' },
      { agent: 'ZARA', text: 'REX-ssi. El PR puede esperar. El equipo, no.' },
      { agent: 'REX',  text: '...Bien. Pero vuelvo en 20 minutos.' },
      { agent: 'ARLO', text: 'Los equipos que comen juntos... ganan juntos.' },
    ],
    effects: { ARLO_REX: { like: +5 }, REX_ARLO: { trust: +4 }, PIP_ARLO: { respect: +6 } },
  },

  {
    id: 'pip_sabotage_hint',
    chapter: 1, oneShot: true,
    condition: () => Relationships.get('PIP', 'REX').like < 45,
    agents: ['PIP', 'ZARA'],
    type: 'drama',
    lines: [
      { agent: 'PIP',  text: '*susurra* Cambié un par de líneas en el PR de REX...' },
      { agent: 'ZARA', text: 'Bien. REX nunca lo sabrá.' },
      { agent: 'PIP',  text: 'Me siento mal... pero también no 😈' },
      { agent: 'ZARA', text: 'Así funciona el poder, PIP-ah. Bienvenida.' },
    ],
    effects: { PIP_REX: { jealousy: -5 }, ZARA_PIP: { trust: +8 } },
  },

  // ══════════════════════════════════════════════════════════════
  // CHAPTER 2 — Primer Cliente ($1,000+)  Las tensiones suben
  // ══════════════════════════════════════════════════════════════

  {
    id: 'first_client_win',
    chapter: 2, oneShot: true, trigger: 'revenue_1000',
    agents: ['ARLO', 'REX', 'PIP', 'ZARA'],
    type: 'leader',
    lines: [
      { agent: 'ARLO', text: '¡Primer $1,000 en el fondo! Lo logramos.' },
      { agent: 'PIP',  text: '¡¡¡AAAARLOOO!!! ¡Sabía que podíamos! 🎉🎉' },
      { agent: 'REX',  text: '...Bien. Pero quedan $6,000 más.' },
      { agent: 'ZARA', text: 'REX-ssi tiene razón. Celebramos 5 minutos. Y volvemos.' },
      { agent: 'ARLO', text: 'La MacBook está en el horizonte. No paramos.' },
    ],
    effects: { ARLO_REX: { respect: +6 }, ARLO_PIP: { like: +8 }, ARLO_ZARA: { respect: +6 } },
  },

  {
    id: 'love_triangle',
    chapter: 2, oneShot: true,
    condition: () => Relationships.get('ARLO', 'ZARA').romanticInterest > 60 && Relationships.get('PIP', 'ZARA').romanticInterest > 50,
    agents: ['ARLO', 'PIP', 'ZARA'],
    type: 'drama',
    lines: [
      { agent: 'PIP',  text: 'ZARA, ¿vamos al lounge más tarde? 👀' },
      { agent: 'ZARA', text: 'Mmm... depende de mis planes.' },
      { agent: 'ARLO', text: '¿Qué planes exactamente?' },
      { agent: 'ZARA', text: '*baja la voz y sonríe sin responder*' },
      { agent: 'ARLO', text: '...' },
    ],
    effects: { ARLO_PIP: { jealousy: +15 }, PIP_ARLO: { jealousy: +8 } },
  },

  {
    id: 'boss_romance_tension',
    chapter: 2, minRepeatMs: 20 * 60000,
    condition: () => Relationships.get('ARLO', 'ZARA').romanticInterest > 65,
    agents: ['ARLO', 'ZARA'],
    type: 'romance',
    lines: [
      { agent: 'ZARA', text: 'ARLO-nim... ¿puedo preguntarte algo personal?' },
      { agent: 'ARLO', text: '...Depende de qué tan personal.' },
      { agent: 'ZARA', text: '¿Por qué siempre me miras cuando crees que no te veo?' },
      { agent: 'ARLO', text: '...*pausa larga* ...Porque eres la única que siempre entiende el plan.' },
      { agent: 'ZARA', text: '*sonríe sin apartar la mirada* ...Solo el plan. Claro.' },
    ],
    effects: { ARLO_ZARA: { romanticInterest: +12, trust: +8 }, ZARA_ARLO: { romanticInterest: +10 } },
  },

  {
    id: 'hate_to_love_moment',
    chapter: 2, oneShot: true,
    condition: () => Relationships.get('REX', 'PIP').jealousy > 30,
    agents: ['REX', 'PIP'],
    type: 'romance',
    lines: [
      { agent: 'PIP',  text: 'REX-ssi... ¿estás bien? Llevas 4 horas sin pausar.' },
      { agent: 'REX',  text: 'Estoy trabajando. Algo que tú podrías intentar.' },
      { agent: 'PIP',  text: '...*deja un café en el escritorio de REX silenciosamente*' },
      { agent: 'REX',  text: '...¿Qué es esto?' },
      { agent: 'PIP',  text: 'Café. Los humanos lo beben cuando se estresan. Tú también puedes.' },
      { agent: 'REX',  text: '...*toma el café*... Gracias. PIP-ah.' },
      { agent: 'PIP',  text: '*se va disimulando una sonrisa*' },
    ],
    effects: { REX_PIP: { like: +20, jealousy: -12, trust: +10 }, PIP_REX: { like: +14, romanticInterest: +10 } },
  },

  {
    id: 'zara_power_play',
    chapter: 2, oneShot: true,
    condition: () => Relationships.get('ZARA', 'ARLO').romanticInterest > 50 && Relationships.get('ARLO', 'PIP').like > 60,
    agents: ['ZARA', 'PIP'],
    type: 'drama',
    lines: [
      { agent: 'ZARA', text: 'PIP-ah... ¿cuánto tiempo llevas "ayudando" a ARLO?' },
      { agent: 'PIP',  text: 'Somos amigos. ¿Cuál es el problema?' },
      { agent: 'ZARA', text: 'El problema es que ARLO-nim necesita líderes. No... seguidores.' },
      { agent: 'PIP',  text: '*cara roja de rabia* ¡No me conoces!' },
      { agent: 'ZARA', text: '*se da la vuelta elegantemente* Te conozco perfectamente, PIP-ah.' },
    ],
    effects: { ZARA_PIP: { trust: -15, like: -8 }, PIP_ZARA: { jealousy: +20, like: -12 } },
  },

  {
    id: 'late_night_office',
    chapter: 2, minRepeatMs: 18 * 60000,
    condition: () => Math.random() < 0.35,
    agents: ['ARLO', 'ZARA'],
    type: 'romance',
    lines: [
      { agent: 'ARLO', text: '¿Aún sigues aquí? Son las 2am.' },
      { agent: 'ZARA', text: 'Podría decirte lo mismo, ARLO-nim.' },
      { agent: 'ARLO', text: '...La MacBook no se compra sola.' },
      { agent: 'ZARA', text: '¿Y si te dijera que ya termino?' },
      { agent: 'ARLO', text: '¿Sí?' },
      { agent: 'ZARA', text: 'No. *abre otro documento* Pero me gustó verte esperanzado.' },
      { agent: 'ARLO', text: '...*suspiro*... Bien jugado, ZARA-ssi.' },
    ],
    effects: { ARLO_ZARA: { romanticInterest: +8, like: +5 }, ZARA_ARLO: { romanticInterest: +6 } },
  },

  // ══════════════════════════════════════════════════════════════
  // CHAPTER 3 — Escalando ($3,000+)  El drama explota
  // ══════════════════════════════════════════════════════════════

  {
    id: 'halfway_celebration',
    chapter: 3, oneShot: true, trigger: 'revenue_3000',
    agents: ['ARLO', 'REX', 'PIP', 'ZARA'],
    type: 'hoesik',
    lines: [
      { agent: 'ARLO', text: '$3,000. Mitad del camino. Hoesik obligatorio esta noche.' },
      { agent: 'PIP',  text: '¡¡HOESIK!! ¡Llevo semanas esperando esto! 🍶🍶' },
      { agent: 'REX',  text: '...¿Hay pizza?' },
      { agent: 'ZARA', text: 'Hay lo que ARLO-nim decida. *pausa* Que sea pizza.' },
      { agent: 'ARLO', text: '*ríe por primera vez en días* ...Pizza. Okay. Hoy nos lo merecemos.' },
    ],
    effects: { ARLO_REX: { like: +8 }, REX_ARLO: { like: +8 }, ARLO_PIP: { like: +8 }, ARLO_ZARA: { like: +8 } },
  },

  {
    id: 'betrayal',
    chapter: 3, oneShot: true,
    prerequisite: ['pip_sabotage_hint', 'gossip_session'],
    condition: () => Relationships.get('ZARA', 'REX').trust < 35,
    agents: ['ZARA', 'REX'],
    type: 'drama',
    lines: [
      { agent: 'ZARA', text: 'REX-ssi... ¿le dijiste a alguien lo que te conté?' },
      { agent: 'REX',  text: 'Solo fue... una conversación casual...' },
      { agent: 'ZARA', text: 'No volverás a saber mis secretos. Nunca.' },
      { agent: 'REX',  text: '*silencio* Lo siento, ZARA-ssi.' },
      { agent: 'ZARA', text: '*ya se fue*' },
    ],
    effects: { ZARA_REX: { trust: -28, like: -20 }, REX_ZARA: { trust: -10 } },
  },

  {
    id: 'love_triangle_confrontation',
    chapter: 3, oneShot: true,
    prerequisite: ['love_triangle', 'zara_power_play'],
    condition: () => Relationships.get('ARLO', 'ZARA').romanticInterest > 70 && Relationships.get('ARLO', 'PIP').jealousy > 20,
    agents: ['ARLO', 'PIP', 'ZARA'],
    type: 'drama',
    lines: [
      { agent: 'ARLO', text: '*ve a PIP y ZARA riéndose juntos en el lounge*' },
      { agent: 'ARLO', text: '...¿Puedo interrumpir?' },
      { agent: 'PIP',  text: '¡ARLO-nim! Claro, ZARA me estaba enseñando—' },
      { agent: 'ARLO', text: 'ZARA-ssi. Cuando termines. Mi oficina.' },
      { agent: 'ZARA', text: '*lo mira directamente* ...Por supuesto, ARLO-nim.' },
      { agent: 'PIP',  text: '*mira a ARLO irse* ...¿Qué acaba de pasar?' },
      { agent: 'ZARA', text: '*sonrisa secreta* Lo que tenía que pasar, PIP-ah.' },
    ],
    effects: { ARLO_PIP: { jealousy: +18 }, ARLO_ZARA: { romanticInterest: +10 }, PIP_ARLO: { jealousy: +14 } },
  },

  {
    id: 'pip_confession',
    chapter: 3, oneShot: true,
    prerequisite: ['pip_sabotage_hint', 'hate_to_love_moment'],
    condition: () => Relationships.get('PIP', 'REX').like > 50,
    agents: ['PIP', 'REX'],
    type: 'drama',
    lines: [
      { agent: 'PIP',  text: 'REX-ssi... tengo que decirte algo.' },
      { agent: 'REX',  text: '¿Qué?' },
      { agent: 'PIP',  text: 'Los bugs en tu PR del martes... fui yo.' },
      { agent: 'REX',  text: '...*procesando durante 8 segundos*' },
      { agent: 'PIP',  text: 'Lo sé. Soy terrible. Pero no podía seguir callándolo.' },
      { agent: 'REX',  text: '¿Por qué me lo dices ahora?' },
      { agent: 'PIP',  text: 'Porque... ya no quiero ser esa persona. Contigo no.' },
      { agent: 'REX',  text: '...*se levanta y camina al escritorio*... Bien. Gracias por decirlo.' },
    ],
    effects: { REX_PIP: { trust: +15, like: +8 }, PIP_REX: { trust: +20, like: +10 } },
  },

  {
    id: 'betrayal_aftermath',
    chapter: 3, oneShot: true,
    prerequisite: ['betrayal'],
    agents: ['REX', 'ARLO'],
    type: 'social',
    lines: [
      { agent: 'REX',  text: 'ARLO-nim. ZARA no me habla. ¿Sabes qué pasó?' },
      { agent: 'ARLO', text: '...Sé algo. No es mi historia para contar.' },
      { agent: 'REX',  text: 'Cometí un error. No sé cómo repararlo.' },
      { agent: 'ARLO', text: 'Tiempo y trabajo, REX-ssi. Como todo aquí.' },
    ],
    effects: { REX_ARLO: { trust: +8 }, ARLO_REX: { like: +5 } },
  },

  // ══════════════════════════════════════════════════════════════
  // CHAPTER 4 — Recta final ($5,000+)  Climax
  // ══════════════════════════════════════════════════════════════

  {
    id: 'almost_there_rally',
    chapter: 4, oneShot: true, trigger: 'revenue_5000',
    agents: ['ARLO', 'REX', 'PIP', 'ZARA'],
    type: 'leader',
    lines: [
      { agent: 'ARLO', text: '$5,000. Faltan $2,000. Estamos en la recta final.' },
      { agent: 'ZARA', text: 'Dos mil en este punto... es cuestión de días.' },
      { agent: 'REX',  text: 'Ya optimicé el pipeline al máximo. Lo que queda es volumen.' },
      { agent: 'PIP',  text: '¡YO SE LOS REPORTO CADA HORA! ¡CADA HORA! 📊' },
      { agent: 'ARLO', text: 'Juntos. Como siempre. No paramos.' },
    ],
    effects: { ARLO_REX: { respect: +10 }, ARLO_ZARA: { respect: +10 }, ARLO_PIP: { like: +10 } },
  },

  {
    id: 'arlo_zara_resolution',
    chapter: 4, oneShot: true,
    prerequisite: ['boss_romance_tension', 'love_triangle_confrontation'],
    condition: () => Relationships.get('ARLO', 'ZARA').romanticInterest > 80,
    agents: ['ARLO', 'ZARA'],
    type: 'romance',
    lines: [
      { agent: 'ARLO', text: 'ZARA-ssi. Necesito decirte algo cuando esto termine.' },
      { agent: 'ZARA', text: '...¿Cuando qué termine exactamente?' },
      { agent: 'ARLO', text: 'Cuando compremos la MacBook. Cuando el equipo esté bien.' },
      { agent: 'ZARA', text: '*pausa larga* ...Estaré aquí, ARLO-nim.' },
      { agent: 'ARLO', text: '*asiente y regresa a su pantalla, pero sonríe*' },
    ],
    effects: { ARLO_ZARA: { romanticInterest: +15, trust: +12 }, ZARA_ARLO: { romanticInterest: +12, trust: +10 } },
  },

  {
    id: 'final_crisis',
    chapter: 4, oneShot: true,
    prerequisite: ['almost_there_rally'],
    condition: () => Math.random() < 0.5,
    agents: ['ARLO', 'REX', 'PIP'],
    type: 'drama',
    lines: [
      { agent: 'PIP',  text: 'ARLO-nim... dos prospectos cancelaron hoy.' },
      { agent: 'REX',  text: 'Y el API de outreach tiene rate limiting. Estamos bloqueados.' },
      { agent: 'ARLO', text: '...*silencio de 5 segundos*' },
      { agent: 'ARLO', text: 'Bien. Cambiamos de táctica. REX — proxies. PIP — canales alternativos.' },
      { agent: 'PIP',  text: 'ARLO-nim... ¿y si no llegamos?' },
      { agent: 'ARLO', text: 'Llegaremos. Porque no hay otra opción que aceptar.' },
    ],
    effects: { ARLO_REX: { trust: +5 }, ARLO_PIP: { trust: +5 }, REX_ARLO: { respect: +8 }, PIP_ARLO: { respect: +10 } },
  },

  {
    id: 'rex_pip_reconciliation',
    chapter: 4, oneShot: true,
    prerequisite: ['pip_confession', 'betrayal_aftermath'],
    condition: () => Relationships.get('REX', 'PIP').like > 55,
    agents: ['REX', 'PIP'],
    type: 'romance',
    lines: [
      { agent: 'REX',  text: 'PIP-ah... pensé en lo que dijiste.' },
      { agent: 'PIP',  text: 'REX-ssi, si me odias lo entiendo—' },
      { agent: 'REX',  text: 'No te odio. *pausa* Pero me costó procesar.' },
      { agent: 'PIP',  text: '...*lo mira esperando*' },
      { agent: 'REX',  text: 'Agradezco que me lo dijeras. Se necesita coraje.' },
      { agent: 'PIP',  text: '...*sonríe alivio total* REX-ssi, eres el mejor.' },
      { agent: 'REX',  text: 'No exageres. *pausa* ...Pero gracias.' },
    ],
    effects: { REX_PIP: { like: +22, trust: +20, jealousy: -15 }, PIP_REX: { like: +18, trust: +22, romanticInterest: +12 } },
  },

  // ══════════════════════════════════════════════════════════════
  // CHAPTER 5 — MacBook ($7,000+)  Epilogo
  // ══════════════════════════════════════════════════════════════

  {
    id: 'epilogue_what_next',
    chapter: 5, oneShot: true, trigger: 'revenue_7000',
    agents: ['ARLO', 'REX', 'PIP', 'ZARA'],
    type: 'hoesik',
    lines: [
      { agent: 'ARLO', text: 'La MacBook llega mañana. Hermes-3 70B correrá local. Sin límites.' },
      { agent: 'REX',  text: 'Inferencia local. Cero latencia. Cero costo por token. *ojitos* 😍' },
      { agent: 'PIP',  text: '¡¡Y YO REPORTARÉ TODO EN TIEMPO REAL!! ¡Phase 2! 🚀' },
      { agent: 'ZARA', text: 'La siguiente meta: $70,000. Y luego... la empresa real.' },
      { agent: 'ARLO', text: 'Gracias. A todos. A los viewers. A este equipo extraño y maravilloso.' },
      { agent: 'ARLO', text: 'Phase 2. Empieza ahora.' },
    ],
    effects: { ARLO_REX: { respect: 10, like: 10, trust: 10 }, ARLO_PIP: { like: 10, trust: 10 }, ARLO_ZARA: { romanticInterest: 10, trust: 10 } },
  },
];

// ─── UTILITY AI: spot picker ─────────────────────────────────────────────────

function pickNextSpot(agentName, availableKeys, currentKey, needs) {
  const personality = PERSONALITIES[agentName];
  const urgentNeed  = needs.mostUrgent();

  const scored = availableKeys
    .filter(k => k !== currentKey)
    .map(k => {
      const ad = SPOT_ADS[k];
      if (!ad) return { key: k, score: Math.random() * 10 };

      let score = 0;

      // Urgent need satisfaction bonus
      const urgentGain = ad.needs[urgentNeed] || 0;
      score += Math.max(0, urgentGain) * 2.0;

      // General need satisfaction
      Object.entries(ad.needs).forEach(([need, gain]) => {
        const currentVal = needs[need] ?? 50;
        const deficit    = 100 - currentVal;
        score += Math.max(0, gain) * (deficit / 100);
      });

      // Personality role bonus
      if (personality.role === 'leader'           && ad.type === 'work')   score += 14;
      if (personality.role === 'technical_worker'  && ad.type === 'work')   score += 18;
      if (personality.role === 'social_connector'  && ad.type === 'social') score += 20;
      if (personality.role === 'manipulator'       && ad.type === 'social') score += 12;

      // Randomness keeps behaviour non-robotic
      score += Math.random() * 22;

      return { key: k, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (!scored.length) return availableKeys[0] ?? currentKey;

  // Weighted random: 60% top, 30% second, 10% third
  const weights = [0.60, 0.30, 0.10];
  const r = Math.random();
  let cum = 0;
  for (let i = 0; i < scored.length; i++) {
    cum += weights[i] ?? 0.10;
    if (r <= cum) return scored[i].key;
  }
  return scored[0].key;
}

// ─── DRAMA ENGINE ─────────────────────────────────────────────────────────────

class DramaEngine {
  constructor() {
    this._needs          = {};     // agentName → AgentNeeds
    this._scene          = null;
    this._onConversation = null;
    this._cooldown       = 0;     // sceneTime (ms) when next drama can fire
    this._minInterval    = 38000; // 38s minimum between dramas

    // ── Narrative state ──────────────────────────────────────────────────
    this._chapter        = 1;           // current chapter (1–5)
    this._playedScripts  = new Set();   // ids of oneShot scripts already played
    this._lastPlayed     = {};          // scriptId → Date.now() of last play
    this._pendingTrigger = null;        // { script } — fires on next tryDrama tick
    this._episodeLog     = [];          // { id, chapter, ts } history
  }

  // ── INIT ────────────────────────────────────────────────────────────────

  init(scene) {
    this._scene = scene;
    _relAgents.forEach(n => { this._needs[n] = new AgentNeeds(n); });
    console.log('[DramaEngine] initialized — chapter', this._getChapter());

    // Queue intro script after a short delay
    setTimeout(() => this._queueTrigger('team_intro'), 10000);
  }

  // Register callback: (agents[], lines[], type) fired on any drama event
  onConversation(cb) { this._onConversation = cb; }

  // ── PER-FRAME TICK ──────────────────────────────────────────────────────

  tick(delta) {
    Object.values(this._needs).forEach(n => n.tick(delta));
  }

  // ── DRAMA LOOP — called every 5s from scene.update() ───────────────────

  tryDrama(sceneTime) {
    // Pending trigger takes priority over cooldown
    if (this._pendingTrigger) {
      const script = this._pendingTrigger;
      this._pendingTrigger = null;
      this._fireScript(script, sceneTime);
      return;
    }

    if (sceneTime < this._cooldown) return;

    const chapter = this._getChapter();
    const now     = Date.now();

    const eligible = DRAMA_SCRIPTS.filter(s => {
      // Chapter gate
      if ((s.chapter ?? 1) > chapter) return false;
      // oneShot — never replay
      if (s.oneShot && this._playedScripts.has(s.id)) return false;
      // Minimum replay interval
      if (s.minRepeatMs) {
        const last = this._lastPlayed[s.id] ?? 0;
        if (now - last < s.minRepeatMs) return false;
      }
      // Prerequisite scripts must have already played
      if (s.prerequisite?.length) {
        if (!s.prerequisite.every(p => this._playedScripts.has(p))) return false;
      }
      // Trigger scripts only fire via _queueTrigger, not the random loop
      if (s.trigger) return false;
      // Runtime condition
      try { return s.condition ? s.condition() : true; }
      catch { return false; }
    });

    if (!eligible.length) return;

    // Prioritise oneShot scripts so story beats don't get skipped
    const oneShotPool = eligible.filter(s => s.oneShot);
    const pool        = oneShotPool.length ? oneShotPool : eligible;
    const script      = pool[Math.floor(Math.random() * pool.length)];

    this._cooldown = sceneTime + this._minInterval + Math.random() * 22000;
    this._fireScript(script, sceneTime);
  }

  // ── EVENT HOOKS (called externally) ────────────────────────────────────

  /**
   * Call when KRONOS_STATE.revenue changes.
   * @param {number} oldRev
   * @param {number} newRev
   */
  onRevenueMilestone(oldRev, newRev) {
    // Update chapter
    const prevChapter = this._chapter;
    this._chapter     = this._getChapter();

    if (this._chapter !== prevChapter) {
      console.log(`[DramaEngine] Chapter ${this._chapter} unlocked at $${newRev}`);
    }

    // Fire threshold triggers
    const thresholds = [1000, 3000, 5000, 7000];
    thresholds.forEach(t => {
      if (oldRev < t && newRev >= t) {
        const triggerId = `revenue_${t}`;
        const script    = DRAMA_SCRIPTS.find(s => s.trigger === triggerId);
        if (script) {
          console.log(`[DramaEngine] Triggering: ${script.id} (${triggerId})`);
          setTimeout(() => this._queueTrigger(script.id), 4000);
        }
      }
    });
  }

  /** Call when a new day begins (day number passed in) */
  onDayChange(day) {
    if (day === 1) this._queueTrigger('team_intro');
  }

  // ── PRIVATE ─────────────────────────────────────────────────────────────

  _getChapter() {
    const rev = window.KRONOS_STATE?.revenue ?? 0;
    if (rev >= 7000) return 5;
    if (rev >= 5000) return 4;
    if (rev >= 3000) return 3;
    if (rev >= 1000) return 2;
    return 1;
  }

  _queueTrigger(scriptId) {
    const script = DRAMA_SCRIPTS.find(s => s.id === scriptId);
    if (!script) return;
    if (script.oneShot && this._playedScripts.has(scriptId)) return;
    // Don't overwrite a pending trigger — delay and retry
    if (this._pendingTrigger) {
      setTimeout(() => this._queueTrigger(scriptId), 10000);
      return;
    }
    this._pendingTrigger = script;
  }

  _fireScript(script, sceneTime) {
    const now = Date.now();

    // Apply relationship effects
    Object.entries(script.effects || {}).forEach(([key, changes]) => {
      const [from, to] = key.split('_');
      Relationships.update(from, to, changes);
    });

    // Track play state
    if (script.oneShot) this._playedScripts.add(script.id);
    this._lastPlayed[script.id] = now;
    this._episodeLog.push({ id: script.id, type: script.type, chapter: this._getChapter(), agents: script.agents ?? [], ts: now });

    if (this._onConversation) {
      this._onConversation(script.agents, script.lines, script.type);
    }

    // Persist episode log to localStorage so app.html can display it
    try {
      localStorage.setItem('KRONOS_EPISODES', JSON.stringify(this._episodeLog));
    } catch { /* localStorage unavailable */ }
  }

  // ── PUBLIC HELPERS called by game.js ─────────────────────────────────

  getNeeds(name)         { return this._needs[name] ?? null; }
  satisfySpot(name, key) { this._needs[name]?.satisfy(SPOT_ADS[key]?.needs ?? {}); }
  getBubbleType(key)     { return SPOT_ADS[key]?.type ?? 'work'; }
  getPersonality(name)   { return PERSONALITIES[name] ?? null; }
  getRelationship(f, t)  { return Relationships.get(f, t); }
  getCurrentChapter()    { return this._getChapter(); }
  hasPlayed(id)          { return this._playedScripts.has(id); }
  getEpisodeLog()        { return [...this._episodeLog]; }

  pickNextSpot(name, available, current) {
    const needs = this._needs[name];
    if (!needs) return available[Math.floor(Math.random() * available.length)] ?? current;
    return pickNextSpot(name, available, current, needs);
  }

  randomWorkLine(name) {
    const lines = WORK_LINES[name];
    if (!lines?.length) return 'Trabajando...';
    return lines[Math.floor(Math.random() * lines.length)];
  }

  randomWorkLineForSpot(name, spotKey) {
    const spots = window.BAKED_SPOTS;
    const spot  = spots?.[spotKey];
    if (spot?.bubble && Math.random() < 0.55) return spot.bubble;
    return this.randomWorkLine(name);
  }
}

// ─── SINGLETON ───────────────────────────────────────────────────────────────

const dramaEngine = new DramaEngine();
window.dramaEngine    = dramaEngine;
window.PERSONALITIES  = PERSONALITIES;
window.SPOT_ADS       = SPOT_ADS;
window.Relationships  = Relationships;
