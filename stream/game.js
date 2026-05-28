/* game.js — Phaser 3 isometric office scene */

const GAME_W = 1030, GAME_H = 648;
const USE_FULL_SCENE_BACKGROUND = true;
const USE_HYBRID_ENVIRONMENT = false;
const USE_BAKED_ENVIRONMENT = true;
const USE_GENERATED_AGENT_ART = true;
// Always attempt to load images — Phaser uses <img> elements so file:// works fine in Chrome.
const CAN_LOAD_PHASER_IMAGES = true;
const OFFICE_BASE_KEY = 'office-full';
const BAKED_ENVIRONMENT_KEY = 'baked-environment';
const OFFICE_BASE_SOURCE = { width: 1672, height: 941 };
const OFFICE_BASE_SCALE = Math.max(
  GAME_W / OFFICE_BASE_SOURCE.width,
  GAME_H / OFFICE_BASE_SOURCE.height
);
const OFFICE_BASE_OFFSET = {
  x: (GAME_W - OFFICE_BASE_SOURCE.width * OFFICE_BASE_SCALE) / 2,
  y: (GAME_H - OFFICE_BASE_SOURCE.height * OFFICE_BASE_SCALE) / 2,
};

// Tile dimensions for isometric grid
const TW = 70, TH = 35;

// Room center positions in screen space (isometric projected)
const ROOMS = {
  work:   { x: 720, y: 200, label: 'WORK',    color: 0x003366 },
  lounge: { x: 310, y: 200, label: 'LOUNGE',  color: 0x331a00 },
  gaming: { x: 310, y: 430, label: 'GAME ROOM', color: 0x1a0033 },
  kitchen:{ x: 720, y: 430, label: 'KITCHEN', color: 0x1a1a0a },
};

// Agent definitions
const AGENTS = {
  ARLO: { color: 0xEF9F27, outlineColor: 0xc47a00, room: 'work',    statusEl: 'arlo-status' },
  REX:  { color: 0x4a8a18, outlineColor: 0x2a5a08, room: 'work',    statusEl: 'rex-status'  },
  ZARA: { color: 0x7F77DD, outlineColor: 0x4a44aa, room: 'kitchen', statusEl: 'zara-status' },
  PIP:  { color: 0xF4C0D1, outlineColor: 0xc090a0, room: 'lounge',  statusEl: 'pip-status'  },
};

const AGENT_UI = {
  ARLO: { role: 'Orquestador', portrait: 'sprites/generated/portraits/arlo.png', accent: '#EF9F27' },
  REX:  { role: 'Investigador', portrait: 'sprites/generated/portraits/rex.png', accent: '#4a8a18' },
  ZARA: { role: 'Ejecutora', portrait: 'sprites/generated/portraits/zara.png', accent: '#7F77DD' },
  PIP:  { role: 'Reportero', portrait: 'sprites/generated/portraits/pip.png', accent: '#F4C0D1' },
};

const AGENT_ACTIVITIES = {
  ARLO: ['working', 'thinking', 'coffee', 'celebrating'],
  REX:  ['researching', 'reading', 'thinking', 'lounge'],
  ZARA: ['typing', 'on_phone', 'gaming', 'coffee'],
  PIP:  ['reporting', 'reviewing', 'lounge', 'gaming'],
};

const ACTIVITY_BUBBLES = {
  ARLO: ['Orquestando el plan del día...', 'Revisando métricas...', 'Pensando en outreach...', 'Analizando oportunidades...'],
  REX:  ['Analizando 15 leads en RM...', 'Scrapeando LinkedIn...', 'Buscando prospectos B2B...', 'Calificando contactos...'],
  ZARA: ['Preparando batch de emails...', 'Enviando outreach...', 'Redactando propuesta...', 'Siguiendo up con clientes...'],
  PIP:  ['Revenue del día: $0', 'Compilando reporte...', 'Actualizando métricas...', 'Calculando conversiones...'],
};

function officePoint(x, y) {
  return {
    x: Math.round(OFFICE_BASE_OFFSET.x + x * OFFICE_BASE_SCALE),
    y: Math.round(OFFICE_BASE_OFFSET.y + y * OFFICE_BASE_SCALE),
  };
}

function officeSpot(x, y, room, options = {}) {
  const { approach, ...rest } = options;
  const mapped = officePoint(x, y);
  return {
    ...mapped,
    room,
    ...rest,
    ...(approach ? { approach: officePoint(approach[0], approach[1]) } : {}),
  };
}

// Navigation map for the hybrid office_base.png image after it is scaled into the
// 1030x648 Phaser canvas. These are foot positions on walkable floor only.
const BAKED_SPOTS = {
  lounge_exit: officeSpot(820, 510, 'lounge'),
  lounge_sofa_left: officeSpot(265, 295, 'lounge', { pose: 'seated', status: 'lounge', bubble: 'Descansando en el lounge...', approach: [330, 360] }),
  lounge_sofa_right: officeSpot(525, 305, 'lounge', { pose: 'seated', status: 'lounge', bubble: 'Revisando ideas en el sofá...', approach: [480, 365] }),
  lounge_table: officeSpot(410, 450, 'lounge', { pose: 'idle', status: 'thinking', bubble: 'Pensando nuevas ofertas...', approach: [410, 450] }),

  work_exit: officeSpot(990, 515, 'work'),
  work_desk_left: officeSpot(1135, 500, 'work', { pose: 'seated', status: 'researching', bubble: 'Analizando leads en pantalla...', approach: [1135, 545] }),
  work_desk_center: officeSpot(1260, 500, 'work', { pose: 'seated', status: 'working', bubble: 'Orquestando el plan del día...', approach: [1260, 545] }),
  work_desk_right: officeSpot(1390, 500, 'work', { pose: 'seated', status: 'typing', bubble: 'Redactando outreach...', approach: [1390, 545] }),
  work_desk_back: officeSpot(1260, 430, 'work', { pose: 'seated', status: 'reviewing', bubble: 'Revisando métricas...', approach: [1260, 485] }),

  gaming_exit: officeSpot(760, 610, 'gaming'),
  gaming_ping_top: officeSpot(270, 710, 'gaming', { pose: 'interact', status: 'gaming', bubble: 'Probando reflejos en ping-pong...', approach: [310, 760] }),
  gaming_ping_bottom: officeSpot(500, 830, 'gaming', { pose: 'interact', status: 'gaming', bubble: 'Peloteando entre tareas...', approach: [455, 790] }),

  kitchen_exit: officeSpot(1020, 670, 'kitchen'),
  kitchen_bar_left: officeSpot(1220, 835, 'kitchen', { pose: 'seated', status: 'coffee', bubble: 'Tomando café táctico...', approach: [1250, 775] }),
  kitchen_bar_right: officeSpot(1350, 835, 'kitchen', { pose: 'seated', status: 'coffee', bubble: 'Esperando que compile el espresso...', approach: [1340, 775] }),
  kitchen_espresso: officeSpot(1390, 720, 'kitchen', { pose: 'interact', status: 'coffee', bubble: 'Calibrando la cafetera...', approach: [1365, 755] }),
  kitchen_counter: officeSpot(1285, 835, 'kitchen', { pose: 'interact', status: 'reviewing', bubble: 'Revisando mugs del equipo...', approach: [1285, 835] }),
};

const BAKED_TRANSIT = {
  lounge: officePoint(820, 510),
  work: officePoint(990, 515),
  gaming: officePoint(760, 610),
  kitchen: officePoint(1020, 670),
  hub_west: officePoint(820, 600),
  hub_south_west: officePoint(850, 690),
  hub_south: officePoint(930, 735),
  hub_south_east: officePoint(1015, 690),
  hub_east: officePoint(1000, 600),
};

const BAKED_ROOM_AISLES = {
  lounge: [officePoint(450, 430)],
  work: [officePoint(1265, 535)],
  gaming: [officePoint(375, 790)],
  kitchen: [officePoint(1285, 835)],
};

const HYBRID_FURNITURE = [
  { key: 'sofa-long', x: 300, y: 330, scale: 0.42, depth: 6 },
  { key: 'sofa-short', x: 555, y: 340, scale: 0.40, depth: 6 },
  { key: 'coffee-table', x: 410, y: 440, scale: 0.42, depth: 7 },

  { key: 'desk-ne', x: 1165, y: 430, scale: 0.21, depth: 6 },
  { key: 'desk-nw', x: 1335, y: 430, scale: 0.21, depth: 6 },
  { key: 'desk-se', x: 1165, y: 535, scale: 0.21, depth: 6 },
  { key: 'desk-sw', x: 1335, y: 535, scale: 0.21, depth: 6 },
  { key: 'office-chair', x: 1100, y: 520, scale: 0.095, depth: 6 },
  { key: 'office-chair-active', x: 1255, y: 520, scale: 0.095, depth: 6 },
  { key: 'office-chair', x: 1410, y: 525, scale: 0.095, depth: 6 },

  { key: 'ping-pong-table', x: 375, y: 805, scale: 0.22, depth: 6 },
  { key: 'ping-pong-paddle-a', x: 270, y: 760, scale: 0.052, depth: 7 },
  { key: 'ping-pong-paddle-b', x: 500, y: 850, scale: 0.052, depth: 7 },
  { key: 'ping-pong-ball', x: 390, y: 810, scale: 0.036, depth: 7 },

  { key: 'kitchen-cabinet', x: 1410, y: 738, scale: 0.31, depth: 6 },
  { key: 'bar-stool', x: 1215, y: 850, scale: 0.12, depth: 8 },
  { key: 'bar-stool-active', x: 1350, y: 850, scale: 0.12, depth: 8 },
];

const BAKED_AGENT_ACTIONS = {
  ARLO: ['work_desk_center', 'work_desk_back', 'lounge_table', 'kitchen_counter'],
  REX: ['work_desk_left', 'work_desk_back', 'gaming_ping_bottom', 'lounge_sofa_right'],
  ZARA: ['work_desk_right', 'kitchen_espresso', 'kitchen_bar_left', 'gaming_ping_top'],
  PIP: ['lounge_sofa_left', 'lounge_table', 'kitchen_bar_right', 'gaming_ping_bottom'],
};

const BAKED_AGENT_START = {
  ARLO: 'work_desk_center',
  REX: 'work_desk_left',
  ZARA: 'kitchen_bar_left',
  PIP: 'lounge_table',
};

const GENERATED_ASSET_BASE = 'sprites/generated/crops';
const WALL_OVERLAY_BASE = 'sprites/generated/walls';

const FURNITURE_ASSETS = [
  { key: 'desk-ne', path: `${GENERATED_ASSET_BASE}/office_workstations/01.png` },
  { key: 'desk-nw', path: `${GENERATED_ASSET_BASE}/office_workstations/02.png` },
  { key: 'desk-se', path: `${GENERATED_ASSET_BASE}/office_workstations/03.png` },
  { key: 'desk-sw', path: `${GENERATED_ASSET_BASE}/office_workstations/04.png` },
  { key: 'office-chair', path: `${GENERATED_ASSET_BASE}/seating_states/01.png` },
  { key: 'office-chair-active', path: `${GENERATED_ASSET_BASE}/seating_states/02.png` },
  { key: 'bar-stool', path: `${GENERATED_ASSET_BASE}/seating_states/03.png` },
  { key: 'bar-stool-active', path: `${GENERATED_ASSET_BASE}/seating_states/04.png` },
  { key: 'sofa-long', path: `${GENERATED_ASSET_BASE}/lounge_sofas_table/04.png` },
  { key: 'sofa-short', path: `${GENERATED_ASSET_BASE}/lounge_sofas_table/05.png` },
  { key: 'coffee-table', path: `${GENERATED_ASSET_BASE}/lounge_sofas_table/06.png` },
  { key: 'ping-pong-table', path: `${GENERATED_ASSET_BASE}/ping_pong/01.png` },
  { key: 'ping-pong-paddle-a', path: `${GENERATED_ASSET_BASE}/ping_pong/02.png` },
  { key: 'ping-pong-paddle-b', path: `${GENERATED_ASSET_BASE}/ping_pong/03.png` },
  { key: 'ping-pong-ball', path: `${GENERATED_ASSET_BASE}/ping_pong/04.png` },
  { key: 'kitchen-cabinet', path: `${GENERATED_ASSET_BASE}/kitchen_espresso_fridge/02.png` },
  { key: 'wall-office', path: `${GENERATED_ASSET_BASE}/architecture_props/01.png` },
  { key: 'wall-lounge', path: `${GENERATED_ASSET_BASE}/architecture_props/02.png` },
  { key: 'wall-game', path: `${GENERATED_ASSET_BASE}/architecture_props/03.png` },
  { key: 'glass-partition', path: `${GENERATED_ASSET_BASE}/architecture_props/08.png` },
  { key: 'bookshelf-prop', path: `${GENERATED_ASSET_BASE}/architecture_props/10.png` },
  { key: 'plant-prop', path: `${GENERATED_ASSET_BASE}/architecture_props/11.png` },
  { key: 'rug-prop', path: `${GENERATED_ASSET_BASE}/architecture_props/12.png` },
  { key: 'globe-prop', path: `${GENERATED_ASSET_BASE}/architecture_props/13.png` },
  { key: 'trash-prop', path: `${GENERATED_ASSET_BASE}/architecture_props/15.png` },
  { key: 'plant-small-prop', path: `${GENERATED_ASSET_BASE}/architecture_props/16.png` },
];

// Frame assignment per agent: [idle, walk1, walk2, seated, interact, talk]
// Mapped from crops/characters_animation/ after visual inspection.
const GENERATED_AGENT_FRAMES = {
  ARLO: ['01', '02', '05', '04', '06', '08'], // 04=at laptop, 08=waving
  REX:  ['09', '12', '16', '10', '13', '14'], // 10=gaming chair, 14=pointing
  ZARA: ['17', '20', '21', '22', '19', '18'], // 22=gaming chair seated
  PIP:  ['26', '28', '29', '25', '27', '30'], // 26=idle+clipboard, 25=desk writing
};

const WALL_OVERLAY_ASSETS = [
  'wall_lounge_back',
  'wall_lounge_side',
  'wall_work_back',
  'wall_work_side',
  'wall_game_back',
  'wall_game_side',
  'wall_kitchen_back',
  'wall_kitchen_side',
];

class OfficeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'OfficeScene' });
    this.agents = {};
    this.bubbles = {};
    this.agentTargets = {};
    this.agentTimers = {};
    this.furnitureGroup = null;
    this.talkingAgent = null;
    this.dialogueUI = null;
    this.activeDialogue = null;
  }

  preload() {
    // Silence load errors — any missing asset falls back to programmatic drawing in create().
    this.load.on('loaderror', (file) => {
      console.warn('[game] Asset not found:', file.src ?? file.key);
    });

    this._loadGeneratedAssets();

    // Programmatic sprites remain as fallback if a generated character frame fails.
    this._generateSprites();
  }

  _loadGeneratedAssets() {
    // office_full.png is loaded via CSS on #game-container — no need to load in Phaser.
    // Only load furniture and character assets needed for the Phaser scene.

    FURNITURE_ASSETS.forEach(asset => {
      this.load.image(asset.key, asset.path);
    });

    WALL_OVERLAY_ASSETS.forEach(key => {
      this.load.image(key, `${WALL_OVERLAY_BASE}/${key}.png`);
    });

    if (USE_GENERATED_AGENT_ART) {
      Object.entries(GENERATED_AGENT_FRAMES).forEach(([agentName, frames]) => {
        frames.forEach(frame => {
          this.load.image(
            this._agentFrameKey(agentName, frame),
            `${GENERATED_ASSET_BASE}/characters_animation/${frame}.png`
          );
        });
      });
    }
  }

  _agentFrameKey(agentName, frame) {
    return `agent-${agentName.toLowerCase()}-${frame}`;
  }

  _generateSprites() {
    const agents = [
      { key: 'arlo', color: '#EF9F27', outline: '#c47a00', type: 'round' },
      { key: 'rex',  color: '#4a8a18', outline: '#2a5a08', type: 'dino'  },
      { key: 'zara', color: '#7F77DD', outline: '#4a44aa', type: 'cyber' },
      { key: 'pip',  color: '#F4C0D1', outline: '#c090a0', type: 'cat'   },
    ];

    agents.forEach(({ key, color, outline, type }) => {
      // Each agent gets its own canvas — shared canvas causes all textures to show last agent
      const c = document.createElement('canvas');
      c.width = 128; c.height = 48;
      const ctx = c.getContext('2d');
      for (let f = 0; f < 4; f++) {
        this._drawAgentFrame(ctx, f * 32 + 16, 24, color, outline, type, f);
      }
      this.textures.addSpriteSheet(key, c, { frameWidth: 32, frameHeight: 48 });
      this.anims.create({
        key: `${key}-walk`,
        frames: this.anims.generateFrameNumbers(key, { frames: [0, 1, 2, 3] }),
        frameRate: 6,
        repeat: -1,
      });
    });
  }

  _drawAgentFrame(ctx, cx, cy, color, outline, type, frame) {
    const bob = frame === 1 ? -1 : frame === 3 ? 1 : 0; // walk bob

    ctx.save();

    // Shadow
    ctx.beginPath();
    ctx.ellipse(cx, cy + 10, 8, 3, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();

    const bodyY = cy + bob;

    if (type === 'round') {
      // ARLO: round amber bot
      // Body
      ctx.beginPath();
      ctx.ellipse(cx, bodyY + 2, 9, 10, 0, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      ctx.strokeStyle = outline; ctx.lineWidth = 1.5; ctx.stroke();

      // Chest panel
      ctx.fillStyle = '#cc7700';
      ctx.fillRect(cx - 4, bodyY - 2, 8, 6);

      // Head
      ctx.beginPath();
      ctx.arc(cx, bodyY - 10, 7, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      ctx.strokeStyle = outline; ctx.stroke();

      // Eyes
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(cx - 3, bodyY - 11, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 3, bodyY - 11, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(cx - 3, bodyY - 11, 1.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 3, bodyY - 11, 1.2, 0, Math.PI * 2); ctx.fill();

      // Antenna + heart
      ctx.strokeStyle = outline; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx, bodyY - 17); ctx.lineTo(cx, bodyY - 21); ctx.stroke();
      ctx.fillStyle = '#ff4466';
      const hx = cx, hy = bodyY - 23;
      ctx.beginPath();
      ctx.arc(hx - 1.5, hy, 2, Math.PI, 0);
      ctx.arc(hx + 1.5, hy, 2, Math.PI, 0);
      ctx.lineTo(hx, hy + 4); ctx.closePath(); ctx.fill();

      // Legs
      ctx.fillStyle = outline;
      const legOff = frame === 1 ? 2 : frame === 2 ? -2 : 0;
      ctx.fillRect(cx - 6, bodyY + 9, 4, 5 + legOff);
      ctx.fillRect(cx + 2, bodyY + 9, 4, 5 - legOff);

    } else if (type === 'dino') {
      // REX: green T-Rex robot
      // Body
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(cx - 7, bodyY - 5, 10, 14, 3);
      ctx.fill();
      ctx.strokeStyle = outline; ctx.lineWidth = 1.5; ctx.stroke();

      // Tiny arms (T-Rex)
      ctx.fillStyle = color;
      ctx.fillRect(cx - 11, bodyY - 2, 4, 3);
      ctx.fillRect(cx + 3, bodyY - 2, 4, 3);

      // Dino head
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(cx - 9, bodyY - 18, 14, 12, 3);
      ctx.fill();
      ctx.strokeStyle = outline; ctx.stroke();

      // Jaw
      ctx.fillStyle = outline;
      ctx.fillRect(cx - 7, bodyY - 8, 12, 3);

      // Glasses
      ctx.strokeStyle = '#aaffaa'; ctx.lineWidth = 1.2;
      ctx.strokeRect(cx - 8, bodyY - 16, 5, 4);
      ctx.strokeRect(cx - 2, bodyY - 16, 5, 4);
      ctx.beginPath(); ctx.moveTo(cx - 3, bodyY - 14); ctx.lineTo(cx - 2, bodyY - 14); ctx.stroke();

      // Eye pupils
      ctx.fillStyle = '#00ff44';
      ctx.fillRect(cx - 7, bodyY - 15, 3, 2);
      ctx.fillRect(cx - 1, bodyY - 15, 3, 2);

      // Legs
      ctx.fillStyle = outline;
      const legOff = frame === 1 ? 2 : frame === 2 ? -2 : 0;
      ctx.fillRect(cx - 6, bodyY + 9, 5, 5 + legOff);
      ctx.fillRect(cx + 1, bodyY + 9, 5, 5 - legOff);

    } else if (type === 'cyber') {
      // ZARA: cyberpunk purple bot
      // Body — angular jacket
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(cx - 8, bodyY + 8);
      ctx.lineTo(cx - 10, bodyY - 4);
      ctx.lineTo(cx, bodyY - 6);
      ctx.lineTo(cx + 10, bodyY - 4);
      ctx.lineTo(cx + 8, bodyY + 8);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = outline; ctx.lineWidth = 1.5; ctx.stroke();

      // Head
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(cx - 7, bodyY - 19, 14, 12, 2);
      ctx.fill();
      ctx.strokeStyle = outline; ctx.stroke();

      // Visor (teal horizontal band)
      ctx.fillStyle = '#00cccc';
      ctx.fillRect(cx - 6, bodyY - 15, 12, 3);

      // Cable hair strands
      const cableColors = ['#ff44ff','#00ffff','#ff8844'];
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = cableColors[i]; ctx.lineWidth = 1.5;
        const ox = cx - 5 + i * 5;
        ctx.beginPath();
        ctx.moveTo(ox, bodyY - 19);
        ctx.quadraticCurveTo(ox + (i-1)*4, bodyY - 26, ox + (i-1)*6, bodyY - 29);
        ctx.stroke();
      }

      // Circuit crown
      ctx.strokeStyle = '#ffff00'; ctx.lineWidth = 1;
      ctx.strokeRect(cx - 6, bodyY - 21, 12, 3);

      // Legs
      ctx.fillStyle = outline;
      const legOff = frame === 1 ? 2 : frame === 2 ? -2 : 0;
      ctx.fillRect(cx - 6, bodyY + 9, 4, 5 + legOff);
      ctx.fillRect(cx + 2, bodyY + 9, 4, 5 - legOff);

    } else if (type === 'cat') {
      // PIP: pink anime cat robot
      // Body
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(cx, bodyY + 2, 8, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = outline; ctx.lineWidth = 1.5; ctx.stroke();

      // Head (big)
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, bodyY - 10, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = outline; ctx.stroke();

      // Cat ears
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(cx - 9, bodyY - 16);
      ctx.lineTo(cx - 5, bodyY - 22);
      ctx.lineTo(cx - 1, bodyY - 16);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + 1, bodyY - 16);
      ctx.lineTo(cx + 5, bodyY - 22);
      ctx.lineTo(cx + 9, bodyY - 16);
      ctx.closePath(); ctx.fill(); ctx.stroke();

      // Huge eyes (anime)
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(cx - 4, bodyY - 11, 3.5, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + 4, bodyY - 11, 3.5, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff6699';
      ctx.beginPath(); ctx.ellipse(cx - 4, bodyY - 11, 2, 2.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + 4, bodyY - 11, 2, 2.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(cx - 4, bodyY - 11, .8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 4, bodyY - 11, .8, 0, Math.PI * 2); ctx.fill();
      // Eye gleam
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(cx - 3, bodyY - 12.5, .7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 5, bodyY - 12.5, .7, 0, Math.PI * 2); ctx.fill();

      // Tail (mechanical, waves with frame)
      const tailAngle = frame * 0.3;
      ctx.strokeStyle = outline; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx + 8, bodyY + 5);
      ctx.quadraticCurveTo(cx + 16, bodyY + 2 + Math.sin(tailAngle) * 5, cx + 14, bodyY - 4);
      ctx.stroke();

      // Legs
      ctx.fillStyle = outline;
      const legOff = frame === 1 ? 2 : frame === 2 ? -2 : 0;
      ctx.fillRect(cx - 5, bodyY + 10, 4, 4 + legOff);
      ctx.fillRect(cx + 1, bodyY + 10, 4, 4 - legOff);
    }

    ctx.restore();
  }

  create() {
    this.furnitureGroup = this.add.group();
    this._dramaTimer    = 0; // accumulator for drama tryDrama checks

    // The office background is now rendered via CSS on #game-container.
    // The Phaser canvas uses transparent: true, so only agents and UI are drawn here.
    // No background drawing needed in Phaser.
    this._createAgents();
    this._createBubbles();
    this._initDialogueUI();
    this._startActivityCycles();
    this._initDrama();

    // expose scene to global for chat.js and drama.js
    window.officeScene  = this;
    window.BAKED_SPOTS  = BAKED_SPOTS; // drama.js uses this for spot bubble text
  }

  _initDrama() {
    const engine = window.dramaEngine;
    if (!engine) return;
    engine.init(this);

    engine.onConversation((agents, lines, type) => {
      this._playConversation(agents, lines, type);
    });
  }

  _drawBakedEnvironment() {
    if (!this.textures.exists(BAKED_ENVIRONMENT_KEY)) return;

    const image = this.add.image(GAME_W / 2, GAME_H / 2, BAKED_ENVIRONMENT_KEY);
    image.setOrigin(0.5);
    const scale = Math.min(GAME_W / image.width, GAME_H / image.height);
    image.setScale(scale);
    image.setDepth(0.5);
  }

  _drawOfficeBaseEnvironment() {
    if (!this.textures.exists(OFFICE_BASE_KEY)) return;

    const image = this.add.image(OFFICE_BASE_OFFSET.x, OFFICE_BASE_OFFSET.y, OFFICE_BASE_KEY);
    image.setOrigin(0, 0);
    image.setScale(OFFICE_BASE_SCALE);
    image.setDepth(0.5);
  }

  _drawBackground() {
    const g = this.add.graphics();
    g.fillStyle(0x080810, 1);
    g.fillRect(0, 0, GAME_W, GAME_H);

    // Subtle dot grid at iso intersections
    g.fillStyle(0x111128, 1);
    for (let r = 0; r < 18; r++) {
      for (let c = 0; c < 22; c++) {
        const sx = (GAME_W / 2) + (c - r) * (TW / 2);
        const sy = 80 + (c + r) * (TH / 2);
        if (sx > 0 && sx < GAME_W && sy > 0 && sy < GAME_H) {
          g.fillRect(sx - 1, sy - 1, 2, 2);
        }
      }
    }
  }

  _isoProject(gx, gy, gz = 0) {
    // Tuned so the four-room diamond fills the 1030x648 stream canvas like the reference art.
    const originX = 480;
    const originY = 112;
    const screenX = originX + (gx - gy) * (TW / 2);
    const screenY = originY + (gx + gy) * (TH / 2) - gz * 16;
    return { x: screenX, y: screenY };
  }

  _drawRooms() {
    const g = this.add.graphics();

    const rooms = [
      { gx: 7, gy: 0, w: 7, h: 6, floor: 0x1a5793, wallL: 0x17324f, wallR: 0x10273f, neon: 0x7ee8ff, label: 'WORK'      },
      { gx: 0, gy: 0, w: 7, h: 6, floor: 0xc35c10, wallL: 0x4b2a21, wallR: 0x2e2423, neon: 0xff8a22, label: 'LOUNGE'    },
      { gx: 0, gy: 6, w: 7, h: 6, floor: 0x6a20af, wallL: 0x20233a, wallR: 0x181b2f, neon: 0xd145ff, label: 'GAME ROOM' },
      { gx: 7, gy: 6, w: 7, h: 6, floor: 0xe8dfbe, wallL: 0x512b22, wallR: 0x2b2625, neon: 0xffdd9a, label: 'KITCHEN'   },
    ];

    rooms.forEach(room => {
      const { gx, gy, w, h } = room;
      // 4 corners of the room parallelogram in screen space
      const tl = this._isoProject(gx,     gy    );
      const tr = this._isoProject(gx + w, gy    );
      const br = this._isoProject(gx + w, gy + h);
      const bl = this._isoProject(gx,     gy + h);

      const wallH = 88;
      this._drawWallFace(g, tl, bl, wallH, room.wallL, room.neon, 'left');
      this._drawWallFace(g, tl, tr, wallH, room.wallR, room.neon, 'right');

      // Floor (top face)
      g.fillStyle(room.floor, 1);
      g.fillPoints([tl, tr, br, bl], true);
      if (room.label === 'GAME ROOM') {
        const splitTop = this._isoProject(gx + w * 0.52, gy);
        const splitBottom = this._isoProject(gx + w * 0.52, gy + h);
        g.fillStyle(0x2c8c41, 0.92);
        g.fillPoints([splitTop, tr, br, splitBottom], true);
      }

      // Thick outer platform edge, matching the reference's solid-room base.
      g.fillStyle(0x0a0c14, 1);
      g.fillPoints([
        bl,
        br,
        { x: br.x, y: br.y + 16 },
        { x: bl.x, y: bl.y + 16 },
      ], true);
      g.fillStyle(0x11131c, 1);
      g.fillPoints([
        tr,
        br,
        { x: br.x, y: br.y + 16 },
        { x: tr.x, y: tr.y + 16 },
      ], true);

      // Subtle tile grid lines on floor
      g.lineStyle(1, 0x000000, 0.2);
      for (let dx = 1; dx < w; dx++) {
        const a = this._isoProject(gx + dx, gy);
        const b = this._isoProject(gx + dx, gy + h);
        g.strokeLineShape(new Phaser.Geom.Line(a.x, a.y, b.x, b.y));
      }
      for (let dy = 1; dy < h; dy++) {
        const a = this._isoProject(gx,     gy + dy);
        const b = this._isoProject(gx + w, gy + dy);
        g.strokeLineShape(new Phaser.Geom.Line(a.x, a.y, b.x, b.y));
      }

      // Room outline
      g.lineStyle(1.5, room.neon, 0.35);
      g.strokePoints([tl, tr, br, bl], true);

      if (room.label === 'GAME ROOM') {
        const mid = this._isoProject(gx + w / 2, gy + h / 2);
        this.add.text(mid.x, mid.y - 14, room.label, {
          fontSize: '9px', fontFamily: 'Courier New',
          color: '#' + room.neon.toString(16).padStart(6, '0'), alpha: 0.55,
        }).setOrigin(0.5).setDepth(1);
      }
    });

    // Center glass dividers
    const gc = this.add.graphics();
    gc.setDepth(3.5);
    gc.lineStyle(2, 0xc8f3ff, 0.75);

    this._drawGlassPanel(gc, this._isoProject(7, 4.1), this._isoProject(7, 7.9), 86);
    this._drawGlassPanel(gc, this._isoProject(5.1, 6), this._isoProject(8.9, 6), 86);
  }

  _addWallOverlays() {
    WALL_OVERLAY_ASSETS.forEach(key => {
      if (!this.textures.exists(key)) return;
      this.add.image(0, 0, key)
        .setOrigin(0, 0)
        .setDepth(1.6);
    });
  }

  _drawWallFace(g, a, b, height, color, neon, side) {
    const aTop = { x: a.x, y: a.y - height };
    const bTop = { x: b.x, y: b.y - height };
    g.fillStyle(color, 1);
    g.fillPoints([aTop, bTop, b, a], true);

    g.lineStyle(1, 0x0c1018, 0.55);
    g.strokePoints([aTop, bTop, b, a], true);

    // Pixel brick courses.
    for (let row = 1; row < 7; row++) {
      const t = row / 7;
      const yOff = -height + t * height;
      g.lineStyle(1, 0x000000, 0.16);
      g.strokeLineShape(new Phaser.Geom.Line(a.x, a.y + yOff, b.x, b.y + yOff));
    }

    const columns = 8;
    for (let col = 1; col < columns; col++) {
      const t = col / columns;
      const x = Phaser.Math.Linear(a.x, b.x, t);
      const y = Phaser.Math.Linear(a.y, b.y, t);
      const topY = y - height + ((col % 2) * 7);
      g.lineStyle(1, 0x000000, 0.11);
      g.strokeLineShape(new Phaser.Geom.Line(x, topY, x, y));
    }

    // Tube light high on the back wall.
    const s = side === 'left' ? 0.18 : 0.22;
    const e = side === 'left' ? 0.76 : 0.78;
    const p1 = {
      x: Phaser.Math.Linear(a.x, b.x, s),
      y: Phaser.Math.Linear(a.y, b.y, s) - height + 22,
    };
    const p2 = {
      x: Phaser.Math.Linear(a.x, b.x, e),
      y: Phaser.Math.Linear(a.y, b.y, e) - height + 22,
    };
    g.lineStyle(8, neon, 0.15);
    g.strokeLineShape(new Phaser.Geom.Line(p1.x, p1.y, p2.x, p2.y));
    g.lineStyle(3, neon, 0.95);
    g.strokeLineShape(new Phaser.Geom.Line(p1.x, p1.y, p2.x, p2.y));
    g.lineStyle(1, 0xffffff, 0.85);
    g.strokeLineShape(new Phaser.Geom.Line(p1.x, p1.y - 1, p2.x, p2.y - 1));
  }

  _drawGlassPanel(g, a, b, height) {
    const aTop = { x: a.x, y: a.y - height };
    const bTop = { x: b.x, y: b.y - height };
    g.fillStyle(0xb9f0ff, 0.14);
    g.fillPoints([aTop, bTop, b, a], true);
    g.lineStyle(3, 0xd8fbff, 0.82);
    g.strokePoints([aTop, bTop, b, a], true);
    g.lineStyle(1, 0xffffff, 0.45);
    for (let i = 1; i < 4; i++) {
      const t = i / 4;
      const p = {
        x: Phaser.Math.Linear(a.x, b.x, t),
        y: Phaser.Math.Linear(a.y, b.y, t),
      };
      g.strokeLineShape(new Phaser.Geom.Line(p.x, p.y - height, p.x, p.y));
    }
    g.strokeLineShape(new Phaser.Geom.Line(aTop.x, aTop.y + height / 2, bTop.x, bTop.y + height / 2));
  }

  _drawIsoTile(g, x, y, floorColor, wallColor) {
    const h = 10; // wall height in px

    // Top face (floor)
    g.fillStyle(floorColor, 1);
    g.fillPoints([
      { x,             y: y - TH/2 },
      { x: x + TW/2,  y            },
      { x,             y: y + TH/2 },
      { x: x - TW/2,  y            },
    ], true);

    // Left wall face (slightly lighter)
    g.fillStyle(wallColor, 0.9);
    g.fillPoints([
      { x: x - TW/2,  y            },
      { x,             y: y + TH/2 },
      { x,             y: y + TH/2 + h },
      { x: x - TW/2,  y: y + h    },
    ], true);

    // Right wall face (darker)
    g.fillStyle(wallColor, 0.6);
    g.fillPoints([
      { x: x + TW/2,  y            },
      { x,             y: y + TH/2 },
      { x,             y: y + TH/2 + h },
      { x: x + TW/2,  y: y + h    },
    ], true);

    // Subtle edge line
    g.lineStyle(1, 0x000000, 0.4);
    g.strokePoints([
      { x,             y: y - TH/2 },
      { x: x + TW/2,  y            },
      { x,             y: y + TH/2 },
      { x: x - TW/2,  y            },
    ], true);
  }

  _drawFurniture() {
    const g = this.add.graphics();
    g.setDepth(2);

    // WORK ROOM: real desk/chair sprites plus small plants/trash.
    this._addIsoAsset('desk-ne', 9.0, 1.45, 1, 0.145, 0, 10);
    this._addIsoAsset('desk-nw', 11.25, 1.55, 1, 0.145, 0, 10);
    this._addIsoAsset('desk-se', 9.05, 3.65, 1, 0.145, 0, 10);
    this._addIsoAsset('desk-sw', 11.25, 3.55, 1, 0.145, 0, 10);
    this._addIsoAsset('office-chair', 8.35, 2.35, 1, 0.065, 0, 4);
    this._addIsoAsset('office-chair-active', 10.7, 2.45, 1, 0.065, 0, 4);
    this._addIsoAsset('office-chair', 9.85, 4.25, 1, 0.065, 0, 4);
    this._addIsoAsset('office-chair-active', 12.1, 4.0, 1, 0.065, 0, 4);
    this._addIsoAsset('plant-prop', 13.1, 1.05, 1, 0.105, 0, 2);
    this._addIsoAsset('trash-prop', 10.4, 4.75, 1, 0.095, 0, 2);

    // LOUNGE ROOM: sofas, table, books, rug and lamp.
    this._drawIsoRug(g, 2.05, 2.75, 3.25, 2.15, 0xd9701d, 0xe5963a);
    this._addIsoAsset('rug-prop', 3.4, 3.55, 0, 0.2, 0, 16, 2.1);
    this._addIsoAsset('sofa-long', 1.75, 2.1, 1, 0.145, 4, 8);
    this._addIsoAsset('sofa-short', 4.8, 2.05, 1, 0.145, -4, 8);
    this._addIsoAsset('coffee-table', 3.35, 3.55, 1, 0.17, 0, 7);
    this._addIsoAsset('bookshelf-prop', 0.75, 0.85, 1, 0.125, -6, 0);
    this._addIsoAsset('globe-prop', 0.55, 4.75, 1, 0.095, 0, 2);
    this._addIsoAsset('plant-small-prop', 5.75, 4.55, 1, 0.105, 0, 2);
    this._drawSideTablePlant(g, 3.25, 1.55);
    this._drawFloorCable(g, [
      this._isoProject(5.9, 2.15, 0.1),
      this._isoProject(6.35, 2.35, 0.1),
      this._isoProject(6.55, 3.05, 0.1),
    ], 0x1e1716);

    // GAME ROOM: large table and separate interactive paddle/ball sprites.
    this._addIsoAsset('ping-pong-table', 3.1, 8.9, 1, 0.122, 0, 15);
    this._addIsoAsset('ping-pong-paddle-a', 2.2, 8.25, 2, 0.048, 0, 0);
    this._addIsoAsset('ping-pong-paddle-b', 4.1, 9.75, 2, 0.048, 0, 0);
    this._addIsoAsset('ping-pong-ball', 3.3, 9.3, 2, 0.032, 0, 0);
    this._addIsoAsset('plant-small-prop', 0.55, 10.7, 1, 0.105, 0, 2);
    this._drawFloorCable(g, [
      this._isoProject(4.6, 10.2, 0.1),
      this._isoProject(5.15, 9.85, 0.1),
      this._isoProject(4.85, 9.35, 0.1),
    ], 0x1c151c);
    this._drawNeonSign(g, 1, 6.5);

    // KITCHEN: generated espresso/fridge unit, stools, and readable ARLO-team mugs.
    this._addIsoAsset('kitchen-cabinet', 10.65, 7.35, 1, 0.17, 8, 14);
    this._drawKitchenBar(g, 8.75, 9.15);
    this._drawBarMugSet(g, 9.55, 9.04);
    this._addIsoAsset('bar-stool', 9.0, 10.05, 1, 0.07, 0, 4);
    this._addIsoAsset('bar-stool-active', 10.65, 10.05, 1, 0.07, 0, 4);
    this._drawMugs(g, 9.75, 9.05);
  }

  _drawHybridFurniture() {
    const barGraphics = this.add.graphics();
    barGraphics.setDepth(8.6);
    this._drawOfficeKitchenBar(barGraphics);
    this._drawOfficeMugs(barGraphics);

    HYBRID_FURNITURE.forEach(item => this._addOfficeAsset(item));
  }

  _addOfficeAsset({ key, x, y, scale, depth = 6, ox = 0, oy = 0 }) {
    if (!this.textures.exists(key)) return null;

    const p = officePoint(x, y);
    const image = this.add.image(p.x + ox, p.y + oy, key);
    image.setOrigin(0.5, 1);
    image.setScale(scale);
    image.setDepth(depth + image.y / 100);
    image.setName(key);
    this.furnitureGroup.add(image);
    return image;
  }

  _drawOfficeKitchenBar(g) {
    const top = [
      officePoint(1145, 725),
      officePoint(1345, 730),
      officePoint(1398, 790),
      officePoint(1218, 840),
    ];
    const drop = 28;

    g.fillStyle(0x6a5742, 1);
    g.fillPoints(top, true);
    g.fillStyle(0x40332a, 1);
    g.fillPoints([
      top[3],
      top[2],
      { x: top[2].x, y: top[2].y + drop },
      { x: top[3].x, y: top[3].y + drop },
    ], true);
    g.fillStyle(0x302721, 1);
    g.fillPoints([
      top[1],
      top[2],
      { x: top[2].x, y: top[2].y + drop },
      { x: top[1].x, y: top[1].y + drop },
    ], true);
    g.lineStyle(2, 0x15100f, 0.9);
    g.strokePoints(top, true);
  }

  _drawOfficeMugs(g) {
    const mugs = [
      { label: 'ARLO', color: 0xef9f27, x: 1190, y: 745 },
      { label: 'REX', color: 0x4a8a18, x: 1262, y: 745 },
      { label: 'PIP', color: 0xf4c0d1, x: 1334, y: 745 },
      { label: 'ZARA', color: 0x7f77dd, x: 1406, y: 745 },
    ];

    mugs.forEach(mug => {
      const p = officePoint(mug.x, mug.y);
      g.fillStyle(mug.color, 1);
      g.fillRect(p.x - 8, p.y - 12, 16, 14);
      g.fillStyle(0x100c0b, 0.35);
      g.fillRect(p.x - 6, p.y - 9, 12, 8);
      g.lineStyle(2, mug.color, 1);
      g.strokeCircle(p.x + 9, p.y - 6, 4);
      this.add.text(p.x, p.y - 5, mug.label, {
        fontSize: '5px',
        fontFamily: 'Courier New',
        color: '#ffffff',
      }).setOrigin(0.5).setDepth(12);
    });
  }

  _drawWallDetails(g) {
    g.setDepth(3);

    let p = this._isoProject(1.0, 0.35, 5.2);
    g.fillStyle(0x6b3f24, 1);
    g.fillRect(p.x - 8, p.y - 2, 88, 4);
    g.fillRect(p.x + 8, p.y + 24, 70, 4);
    const bookColors = [0xb45a3c, 0xe0a45b, 0xd5d2bf, 0x487a62, 0x6e78a8];
    for (let i = 0; i < 9; i++) {
      g.fillStyle(bookColors[i % bookColors.length], 1);
      g.fillRect(p.x + i * 8, p.y - 24 + (i % 2) * 4, 5, 22 - (i % 3) * 3);
    }
    this._drawWallShelf(g, 1.95, 0.34, 5.0, 78, [0xd27a4d, 0xf0c676, 0xd8e0d2, 0x7d9f7e]);
    this._drawLowBrickPatch(g, 0.15, 3.45, 2.2, 86, 28, 0x5b3429);

    p = this._isoProject(8.4, 0.38, 4.6);
    g.fillStyle(0xd9e0d6, 1);
    g.fillRect(p.x - 10, p.y - 28, 28, 38);
    g.fillStyle(0x356c72, 1);
    g.fillCircle(p.x + 4, p.y - 10, 7);
    g.fillRect(p.x - 5, p.y - 13, 18, 6);
    g.lineStyle(2, 0x101622, 0.9);
    const cableA = this._isoProject(8.0, 1.0, 1);
    const cableB = this._isoProject(9.0, 2.0, 1);
    g.strokeLineShape(new Phaser.Geom.Line(cableA.x, cableA.y, cableB.x, cableB.y));
    this._drawWallDevice(g, 10.9, 0.32, 5.75, 24, 18, 0x1d2730, 0x8cecff);
    this._drawDeskCableBundle(g, 9.8, 4.2);

    p = this._isoProject(1.05, 6.25, 4.6);
    g.fillStyle(0x111421, 1);
    g.fillRect(p.x - 24, p.y - 18, 36, 22);
    g.lineStyle(1, 0x39ff88, 0.9);
    g.strokeRect(p.x - 24, p.y - 18, 36, 22);
    g.fillStyle(0x39ff88, 1);
    for (let i = 0; i < 5; i++) g.fillRect(p.x - 18 + i * 6, p.y - 10, 3, 3);
    g.fillStyle(0xe6d8a8, 1);
    g.fillRect(p.x + 46, p.y - 22, 24, 34);
    g.fillStyle(0xd145ff, 1);
    g.fillRect(p.x + 49, p.y - 18, 18, 3);
    this._drawGameRoomWallSign(g, 1.25, 7.3);
    this._drawWallDevice(g, 3.1, 6.18, 4.25, 35, 22, 0x231331, 0xd145ff);
    this._drawLowBrickPatch(g, 6.85, 7.1, 2.0, 26, 86, 0x3c2427);

    p = this._isoProject(8.2, 6.35, 4.8);
    g.fillStyle(0xf1d2a4, 1);
    g.fillRect(p.x - 8, p.y - 18, 26, 28);
    g.fillStyle(0x442316, 1);
    g.fillRect(p.x - 3, p.y - 12, 15, 14);
    g.fillStyle(0xf7f1d8, 1);
    g.fillRect(p.x + 28, p.y - 6, 9, 12);
    g.fillRect(p.x + 40, p.y - 11, 12, 16);
    this._drawLowBrickPatch(g, 7.1, 7.2, 2.0, 92, 38, 0x6a3429);
    this._drawWallDevice(g, 7.45, 7.95, 3.05, 24, 18, 0x2d3f3a, 0x86ff91);

    // Lounge: vents, outlets, framed poster and corner utility box.
    this._drawVent(g, 0.22, 2.25, 3.2, 0x2b2524);
    this._drawOutlet(g, 0.35, 4.25, 2.4, 0x3e332f);
    this._drawWallPoster(g, 5.85, 0.4, 4.2, 34, 48, 0x2d2430, 0x76c761);
    this._drawJunctionBox(g, 6.65, 1.55, 2.7, 0x2f3832, 0x86ff91);
    this._drawConduit(g, [
      this._isoProject(6.45, 0.45, 5.0),
      this._isoProject(6.45, 1.55, 5.0),
      this._isoProject(6.65, 1.55, 2.9),
    ], 0x1a1719, 2);
    this._drawWallDevice(g, 5.65, 4.7, 2.6, 42, 14, 0x2e2423, 0xff8a22);

    // Work office: pipes, monitor posters, outlet/cable runs and small control boxes.
    this._drawVerticalPipe(g, 7.25, 0.18, 1.0, 6.5, 0x394b5a);
    this._drawVerticalPipe(g, 12.55, 0.18, 1.0, 6.5, 0x415767);
    this._drawVerticalPipe(g, 13.15, 1.55, 1.0, 6.0, 0x405465);
    this._drawWallPoster(g, 8.55, 0.35, 4.5, 34, 48, 0xe2e9e5, 0x3d8590);
    this._drawStickyNotes(g, 9.35, 0.32, 3.8);
    this._drawJunctionBox(g, 12.85, 0.55, 4.7, 0x27313a, 0x7ee8ff);
    this._drawOutlet(g, 7.65, 4.7, 2.1, 0xa6c4d4);
    this._drawOutlet(g, 12.85, 4.5, 2.1, 0xa6c4d4);
    this._drawConduit(g, [
      this._isoProject(7.65, 4.7, 2.1),
      this._isoProject(8.25, 4.2, 1.4),
      this._isoProject(9.2, 3.65, 1.2),
    ], 0x101622, 2);
    this._drawConduit(g, [
      this._isoProject(12.85, 4.5, 2.1),
      this._isoProject(12.1, 4.0, 1.2),
      this._isoProject(11.3, 3.55, 1.1),
    ], 0x101622, 2);
    this._drawFloorCable(g, [
      this._isoProject(11.75, 4.65, 0.1),
      this._isoProject(11.4, 4.95, 0.1),
      this._isoProject(10.9, 4.7, 0.1),
      this._isoProject(10.6, 4.95, 0.1),
    ], 0x0d1119);

    // Game room: more neon panels, vertical tubes, poster, controls and low wall cable.
    this._drawNeonTube(g, 0.32, 7.45, 3.5, 58, 0xff4cf5, true);
    this._drawNeonTube(g, 6.55, 7.1, 3.8, 60, 0x69ff82, true);
    this._drawWallPanel(g, 1.5, 6.28, 4.2, 42, 26, 0x121826, 0x31ff77);
    this._drawWallPanel(g, 2.35, 6.25, 4.1, 38, 25, 0x20132e, 0xd145ff);
    this._drawWallPoster(g, 5.55, 6.2, 4.0, 26, 40, 0xf0dc9c, 0x7f77dd);
    this._drawJunctionBox(g, 6.75, 7.25, 2.8, 0x2b252a, 0xff4cf5);
    this._drawConduit(g, [
      this._isoProject(0.35, 10.75, 2.4),
      this._isoProject(2.1, 10.75, 2.4),
      this._isoProject(3.15, 10.2, 1.4),
    ], 0x111421, 2);
    this._drawWallDevice(g, 6.45, 8.0, 3.25, 20, 28, 0x1a1821, 0x69ff82);
    this._drawOutlet(g, 0.45, 8.65, 2.6, 0xd145ff);

    // Kitchen: brick-side electrical boxes, framed print, fridge notes and pipe/vent pieces.
    this._drawVent(g, 7.25, 6.32, 4.9, 0xd9b99a);
    this._drawWallPoster(g, 8.35, 6.3, 4.0, 30, 36, 0xf1d2a4, 0xb35f3a);
    this._drawStickyNotes(g, 8.95, 6.32, 3.2);
    this._drawJunctionBox(g, 13.35, 6.6, 4.4, 0x4d4a43, 0xffdd9a);
    this._drawVerticalPipe(g, 12.75, 6.18, 1.0, 6.5, 0x6c7771);
    this._drawOutlet(g, 7.65, 8.25, 2.6, 0xd7c6a2);
    this._drawConduit(g, [
      this._isoProject(7.65, 8.25, 2.6),
      this._isoProject(8.3, 7.7, 2.6),
      this._isoProject(10.1, 7.25, 2.4),
    ], 0x241c18, 2);
    this._drawWallDevice(g, 12.85, 7.65, 3.75, 18, 18, 0xf3ead2, 0x2a2320);
    this._drawFridgeMagnets(g, 13.0, 8.0);
  }

  _drawWallPanel(g, gx, gy, gz, w, h, fill, accent) {
    const p = this._isoProject(gx, gy, gz);
    g.fillStyle(fill, 1);
    g.fillRect(p.x - w / 2, p.y - h / 2, w, h);
    g.lineStyle(1, accent, 0.95);
    g.strokeRect(p.x - w / 2, p.y - h / 2, w, h);
    g.fillStyle(accent, 0.9);
    for (let i = 0; i < 5; i++) {
      g.fillRect(p.x - w / 2 + 7 + i * 7, p.y - 2, 3, 3);
    }
  }

  _drawWallShelf(g, gx, gy, gz, width, colors) {
    const p = this._isoProject(gx, gy, gz);
    g.fillStyle(0x5b3521, 1);
    g.fillRect(p.x - width / 2, p.y + 8, width, 5);
    g.fillStyle(0x2b1b15, 1);
    g.fillRect(p.x - width / 2 + 4, p.y + 13, width - 8, 3);
    for (let i = 0; i < 8; i++) {
      g.fillStyle(colors[i % colors.length], 1);
      g.fillRect(p.x - width / 2 + 9 + i * 8, p.y - 13 + (i % 2) * 3, 5, 21 - (i % 3) * 4);
    }
  }

  _drawLowBrickPatch(g, gx, gy, gz, width, height, color) {
    const p = this._isoProject(gx, gy, gz);
    g.fillStyle(color, 0.92);
    g.fillRect(p.x - width / 2, p.y - height / 2, width, height);
    g.lineStyle(1, 0x120d0c, 0.35);
    for (let y = 6; y < height; y += 8) {
      g.strokeLineShape(new Phaser.Geom.Line(p.x - width / 2, p.y - height / 2 + y, p.x + width / 2, p.y - height / 2 + y));
    }
    for (let x = 8; x < width; x += 18) {
      g.strokeLineShape(new Phaser.Geom.Line(p.x - width / 2 + x, p.y - height / 2, p.x - width / 2 + x, p.y + height / 2));
    }
  }

  _drawWallDevice(g, gx, gy, gz, w, h, fill, accent) {
    const p = this._isoProject(gx, gy, gz);
    g.fillStyle(0x080a0f, 1);
    g.fillRect(p.x - w / 2 - 2, p.y - h / 2 - 2, w + 4, h + 4);
    g.fillStyle(fill, 1);
    g.fillRect(p.x - w / 2, p.y - h / 2, w, h);
    g.fillStyle(accent, 0.95);
    g.fillRect(p.x - w / 2 + 5, p.y - h / 2 + 5, Math.max(6, w - 10), 3);
    if (h > 18) {
      g.fillRect(p.x - w / 2 + 6, p.y + 2, 4, 4);
      g.fillRect(p.x + w / 2 - 10, p.y + 2, 4, 4);
    }
  }

  _drawGameRoomWallSign(g, gx, gy) {
    const p = this._isoProject(gx, gy, 3.35);
    g.lineStyle(7, 0xff4cf5, 0.14);
    g.strokeLineShape(new Phaser.Geom.Line(p.x - 46, p.y + 16, p.x + 54, p.y + 16));
    g.lineStyle(3, 0xff4cf5, 0.95);
    g.strokeLineShape(new Phaser.Geom.Line(p.x - 46, p.y + 16, p.x + 54, p.y + 16));
    const sign = this.add.text(p.x + 4, p.y + 26, 'GAME ROOM', {
      fontSize: '13px',
      fontFamily: 'Courier New',
      color: '#d145ff',
      stroke: '#20132e',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(4);
    sign.setRotation(-0.12);
  }

  _drawDeskCableBundle(g, gx, gy) {
    const a = this._isoProject(gx, gy, 0.1);
    const points = [
      { x: a.x - 18, y: a.y },
      { x: a.x - 3, y: a.y + 8 },
      { x: a.x + 14, y: a.y + 3 },
      { x: a.x + 30, y: a.y + 10 },
    ];
    this._drawConduit(g, points, 0x101622, 2);
    g.fillStyle(0x17202a, 1);
    g.fillCircle(a.x + 33, a.y + 10, 4);
  }

  _drawFloorCable(g, points, color) {
    g.lineStyle(4, 0x050506, 0.7);
    for (let i = 0; i < points.length - 1; i++) {
      g.strokeLineShape(new Phaser.Geom.Line(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y));
    }
    g.lineStyle(2, color, 1);
    for (let i = 0; i < points.length - 1; i++) {
      g.strokeLineShape(new Phaser.Geom.Line(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y));
    }
  }

  _drawSideTablePlant(g, gx, gy) {
    const p = this._isoProject(gx, gy, 0.8);
    g.fillStyle(0x3b2c1d, 1);
    g.fillRect(p.x - 11, p.y - 4, 22, 5);
    g.fillStyle(0x221912, 1);
    g.fillRect(p.x - 8, p.y + 1, 4, 15);
    g.fillRect(p.x + 4, p.y + 1, 4, 15);
    g.fillStyle(0xe8dfbe, 1);
    g.fillRect(p.x - 7, p.y - 21, 14, 13);
    g.fillStyle(0x3c8a48, 1);
    g.fillRect(p.x - 2, p.y - 33, 4, 15);
    g.fillRect(p.x - 8, p.y - 28, 5, 10);
    g.fillRect(p.x + 4, p.y - 29, 5, 11);
  }

  _drawBarMugSet(g, gx, gy) {
    const p = this._isoProject(gx, gy, 1.65);
    const mugs = [
      { label: 'ARLO', color: 0xef9f27, dx: -40 },
      { label: 'REX', color: 0x4a8a18, dx: -14 },
      { label: 'PIP', color: 0xf4c0d1, dx: 12 },
      { label: 'ZARA', color: 0x7f77dd, dx: 40 },
    ];
    mugs.forEach(mug => {
      g.fillStyle(mug.color, 1);
      g.fillRect(p.x + mug.dx - 8, p.y - 14, 16, 14);
      g.fillStyle(0x100c0b, 0.35);
      g.fillRect(p.x + mug.dx - 6, p.y - 11, 12, 8);
      g.lineStyle(2, mug.color, 1);
      g.strokeCircle(p.x + mug.dx + 9, p.y - 7, 4);
      this.add.text(p.x + mug.dx, p.y - 7, mug.label, {
        fontSize: '5px',
        fontFamily: 'Courier New',
        color: '#ffffff',
      }).setOrigin(0.5).setDepth(6);
    });
  }

  _drawFridgeMagnets(g, gx, gy) {
    const p = this._isoProject(gx, gy, 2.6);
    const magnets = [
      { dx: -6, dy: -22, color: 0xff3344 },
      { dx: 8, dy: -12, color: 0x00d4ff },
      { dx: -2, dy: 2, color: 0xf7f1d8 },
    ];
    magnets.forEach(m => {
      g.fillStyle(m.color, 1);
      g.fillRect(p.x + m.dx, p.y + m.dy, 8, 7);
    });
  }

  _drawWallPoster(g, gx, gy, gz, w, h, paper, ink) {
    const p = this._isoProject(gx, gy, gz);
    g.fillStyle(0x18131a, 1);
    g.fillRect(p.x - w / 2 - 3, p.y - h / 2 - 3, w + 6, h + 6);
    g.fillStyle(paper, 1);
    g.fillRect(p.x - w / 2, p.y - h / 2, w, h);
    g.fillStyle(ink, 1);
    g.fillRect(p.x - w / 2 + 5, p.y - h / 2 + 7, w - 10, 4);
    g.fillCircle(p.x, p.y + 4, Math.max(5, Math.min(w, h) * 0.18));
    g.fillRect(p.x - w * 0.22, p.y + 1, w * 0.44, 6);
  }

  _drawVent(g, gx, gy, gz, color) {
    const p = this._isoProject(gx, gy, gz);
    g.fillStyle(0x17191f, 1);
    g.fillRect(p.x - 18, p.y - 9, 36, 18);
    g.lineStyle(1, color, 0.75);
    g.strokeRect(p.x - 18, p.y - 9, 36, 18);
    for (let i = 0; i < 4; i++) {
      g.strokeLineShape(new Phaser.Geom.Line(p.x - 13, p.y - 5 + i * 4, p.x + 13, p.y - 5 + i * 4));
    }
  }

  _drawOutlet(g, gx, gy, gz, color) {
    const p = this._isoProject(gx, gy, gz);
    g.fillStyle(0x111319, 1);
    g.fillRect(p.x - 8, p.y - 7, 16, 14);
    g.lineStyle(1, color, 0.9);
    g.strokeRect(p.x - 8, p.y - 7, 16, 14);
    g.fillStyle(color, 0.9);
    g.fillRect(p.x - 4, p.y - 2, 2, 4);
    g.fillRect(p.x + 2, p.y - 2, 2, 4);
  }

  _drawJunctionBox(g, gx, gy, gz, fill, light) {
    const p = this._isoProject(gx, gy, gz);
    g.fillStyle(fill, 1);
    g.fillRect(p.x - 10, p.y - 12, 20, 24);
    g.lineStyle(1, 0x0b0f14, 1);
    g.strokeRect(p.x - 10, p.y - 12, 20, 24);
    g.fillStyle(light, 0.9);
    g.fillRect(p.x - 4, p.y - 7, 8, 3);
    g.fillRect(p.x - 3, p.y + 3, 6, 3);
  }

  _drawVerticalPipe(g, gx, gy, gzStart, gzEnd, color) {
    const bottom = this._isoProject(gx, gy, gzStart);
    const top = this._isoProject(gx, gy, gzEnd);
    g.lineStyle(6, 0x0b0f14, 0.8);
    g.strokeLineShape(new Phaser.Geom.Line(bottom.x, bottom.y, top.x, top.y));
    g.lineStyle(3, color, 1);
    g.strokeLineShape(new Phaser.Geom.Line(bottom.x, bottom.y, top.x, top.y));
    g.fillStyle(0x9fb4bd, 1);
    g.fillCircle(top.x, top.y + 6, 4);
    g.fillCircle(bottom.x, bottom.y - 4, 4);
  }

  _drawNeonTube(g, gx, gy, gz, length, color, vertical = false) {
    const p = this._isoProject(gx, gy, gz);
    const line = vertical
      ? new Phaser.Geom.Line(p.x, p.y - length / 2, p.x, p.y + length / 2)
      : new Phaser.Geom.Line(p.x - length / 2, p.y, p.x + length / 2, p.y);
    g.lineStyle(10, color, 0.16);
    g.strokeLineShape(line);
    g.lineStyle(3, color, 0.95);
    g.strokeLineShape(line);
    g.lineStyle(1, 0xffffff, 0.85);
    g.strokeLineShape(line);
  }

  _drawConduit(g, points, color, width = 2) {
    g.lineStyle(width + 2, 0x05070a, 0.65);
    for (let i = 0; i < points.length - 1; i++) {
      g.strokeLineShape(new Phaser.Geom.Line(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y));
    }
    g.lineStyle(width, color, 1);
    for (let i = 0; i < points.length - 1; i++) {
      g.strokeLineShape(new Phaser.Geom.Line(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y));
    }
  }

  _drawStickyNotes(g, gx, gy, gz) {
    const p = this._isoProject(gx, gy, gz);
    const notes = [
      { dx: -8, dy: -6, color: 0xf3e29b },
      { dx: 7, dy: -2, color: 0xd8f3c2 },
      { dx: 0, dy: 11, color: 0xf3c7b0 },
    ];
    notes.forEach(note => {
      g.fillStyle(note.color, 1);
      g.fillRect(p.x + note.dx, p.y + note.dy, 10, 9);
      g.fillStyle(0x2b2420, 0.28);
      g.fillRect(p.x + note.dx + 2, p.y + note.dy + 3, 6, 1);
    });
  }

  _drawIsoRug(g, gx, gy, w, h, fill, line) {
    const a = this._isoProject(gx, gy, 0.05);
    const b = this._isoProject(gx + w, gy, 0.05);
    const c = this._isoProject(gx + w, gy + h, 0.05);
    const d = this._isoProject(gx, gy + h, 0.05);
    g.fillStyle(fill, 0.88);
    g.fillPoints([a, b, c, d], true);
    g.lineStyle(2, line, 0.8);
    g.strokePoints([a, b, c, d], true);
    g.lineStyle(1, line, 0.45);
    const inset = 0.25;
    const ia = this._isoProject(gx + inset, gy + inset, 0.05);
    const ib = this._isoProject(gx + w - inset, gy + inset, 0.05);
    const ic = this._isoProject(gx + w - inset, gy + h - inset, 0.05);
    const id = this._isoProject(gx + inset, gy + h - inset, 0.05);
    g.strokePoints([ia, ib, ic, id], true);
  }

  _drawKitchenBar(g, gx, gy) {
    const top = [
      this._isoProject(gx, gy, 1),
      this._isoProject(gx + 3.25, gy, 1),
      this._isoProject(gx + 3.25, gy + 1.05, 1),
      this._isoProject(gx, gy + 1.05, 1),
    ];
    const drop = 26;
    g.fillStyle(0x554534, 1);
    g.fillPoints(top, true);
    g.fillStyle(0x372c25, 1);
    g.fillPoints([
      top[3],
      top[2],
      { x: top[2].x, y: top[2].y + drop },
      { x: top[3].x, y: top[3].y + drop },
    ], true);
    g.fillStyle(0x28211e, 1);
    g.fillPoints([
      top[1],
      top[2],
      { x: top[2].x, y: top[2].y + drop },
      { x: top[1].x, y: top[1].y + drop },
    ], true);
    g.lineStyle(1, 0x1a1412, 1);
    g.strokePoints(top, true);
  }

  _addIsoAsset(key, gx, gy, gz, scale, ox = 0, oy = 0, depthOffset = 4) {
    if (!this.textures.exists(key)) return null;

    const { x, y } = this._isoProject(gx, gy, gz);
    const image = this.add.image(x + ox, y + oy, key);
    image.setOrigin(0.5, 1);
    image.setScale(scale);
    image.setDepth(depthOffset + y / 100);
    image.setName(key);
    this.furnitureGroup.add(image);
    return image;
  }

  _drawDesk(g, gx, gy, color) {
    const { x, y } = this._isoProject(gx, gy, 1);
    g.fillStyle(color, 1);
    g.fillPoints([
      { x: x,         y: y - 16 },
      { x: x + 28,    y: y - 2  },
      { x: x,         y: y + 12 },
      { x: x - 28,    y: y - 2  },
    ], true);
    g.fillStyle(0x224488, 1);
    g.fillPoints([
      { x: x - 28,    y: y - 2  },
      { x: x,         y: y + 12 },
      { x: x,         y: y + 22 },
      { x: x - 28,    y: y + 8  },
    ], true);
    g.fillStyle(0x1a3366, 1);
    g.fillPoints([
      { x: x + 28,    y: y - 2  },
      { x: x,         y: y + 12 },
      { x: x,         y: y + 22 },
      { x: x + 28,    y: y + 8  },
    ], true);
  }

  _drawMonitor(g, gx, gy) {
    const { x, y } = this._isoProject(gx, gy, 2);
    // Screen glow
    g.fillStyle(0x003300, 0.9);
    g.fillRect(x - 12, y - 20, 24, 16);
    g.fillStyle(0x00ff44, 0.8);
    // Terminal text lines
    for (let i = 0; i < 4; i++) {
      g.fillRect(x - 10, y - 18 + i * 4, Phaser.Math.Between(8, 18), 1);
    }
    // Monitor stand
    g.fillStyle(0x222244, 1);
    g.fillRect(x - 2, y - 4, 4, 6);
    g.fillRect(x - 5, y + 2, 10, 2);
  }

  _drawPlant(g, gx, gy) {
    const { x, y } = this._isoProject(gx, gy, 1);
    g.fillStyle(0x442200, 1);
    g.fillRect(x - 5, y, 10, 8);
    g.fillStyle(0x226622, 1);
    g.beginPath();
    g.arc(x, y, 10, 0, Math.PI * 2);
    g.fillPath();
    g.fillStyle(0x338833, 1);
    g.beginPath();
    g.arc(x - 4, y - 4, 6, 0, Math.PI * 2);
    g.fillPath();
    g.beginPath();
    g.arc(x + 4, y - 5, 6, 0, Math.PI * 2);
    g.fillPath();
  }

  _drawSofa(g, gx, gy) {
    const { x, y } = this._isoProject(gx, gy, 1);
    // Sofa base
    g.fillStyle(0x1a1a1a, 1);
    g.fillPoints([
      { x: x, y: y - 20 }, { x: x + 40, y: y }, { x: x, y: y + 20 }, { x: x - 40, y: y }
    ], true);
    // Back cushion
    g.fillStyle(0x111111, 1);
    g.fillRect(x - 30, y - 16, 60, 10);
    // Seat highlights
    g.fillStyle(0x2a2a2a, 1);
    g.fillPoints([
      { x: x, y: y - 5 }, { x: x + 30, y: y + 8 }, { x: x, y: y + 15 }, { x: x - 30, y: y + 8 }
    ], true);
  }

  _drawTable(g, gx, gy) {
    const { x, y } = this._isoProject(gx, gy, 1);
    g.fillStyle(0x3a2a1a, 1);
    g.fillPoints([
      { x: x, y: y - 12 }, { x: x + 20, y: y }, { x: x, y: y + 12 }, { x: x - 20, y: y }
    ], true);
  }

  _drawBookshelf(g, gx, gy) {
    const { x, y } = this._isoProject(gx, gy, 1);
    g.fillStyle(0x3a2a1a, 1);
    g.fillRect(x - 16, y - 30, 32, 36);
    // Books
    const bookColors = [0x4444aa, 0xaa4444, 0x44aa44, 0xaaaa44, 0x44aaaa];
    for (let i = 0; i < 5; i++) {
      g.fillStyle(bookColors[i], 1);
      g.fillRect(x - 14 + i * 6, y - 28, 4, 14);
    }
    for (let i = 0; i < 4; i++) {
      g.fillStyle(bookColors[(i + 2) % 5], 1);
      g.fillRect(x - 12 + i * 7, y - 10, 5, 10);
    }
  }

  _drawPingPong(g, gx, gy) {
    const { x, y } = this._isoProject(gx, gy, 1);
    // Table
    g.fillStyle(0x006644, 1);
    g.fillPoints([
      { x: x, y: y - 24 }, { x: x + 50, y: y }, { x: x, y: y + 24 }, { x: x - 50, y: y }
    ], true);
    // Net
    g.lineStyle(2, 0xffffff, 0.8);
    g.strokeLineShape(new Phaser.Geom.Line(x - 3, y - 6, x + 3, y + 6));
    // Lines
    g.lineStyle(1, 0x008855, 0.6);
    g.strokeLineShape(new Phaser.Geom.Line(x - 45, y, x + 45, y));
    // Paddles
    g.fillStyle(0xff2222, 1);
    g.fillCircle(x - 30, y + 15, 5);
    g.fillCircle(x + 30, y - 15, 5);
  }

  _drawNeonSign(g, gx, gy) {
    const { x, y } = this._isoProject(gx, gy, 3);
    const txt = this.add.text(x, y, 'GAME ROOM', {
      fontSize: '11px',
      fontFamily: 'Courier New',
      color: '#cc44ff',
      stroke: '#ff00ff',
      strokeThickness: 1,
    }).setOrigin(0.5).setDepth(5);

    // Flicker animation
    this.tweens.add({
      targets: txt, alpha: { from: 0.7, to: 1 },
      duration: 200, yoyo: true, repeat: -1,
      repeatDelay: Phaser.Math.Between(2000, 5000),
    });
  }

  _drawCounter(g, gx, gy) {
    const { x, y } = this._isoProject(gx, gy, 1);
    g.fillStyle(0x555544, 1);
    g.fillPoints([
      { x: x, y: y - 16 }, { x: x + 36, y: y }, { x: x, y: y + 16 }, { x: x - 36, y: y }
    ], true);
    // Coffee machine
    g.fillStyle(0x333333, 1);
    g.fillRect(x + 10, y - 20, 18, 20);
    g.fillStyle(0xcc6600, 1);
    g.fillRect(x + 14, y - 16, 10, 8);
    // Spout
    g.fillStyle(0x222222, 1);
    g.fillRect(x + 17, y - 8, 4, 5);
  }

  _drawMugs(g, gx, gy) {
    const { x, y } = this._isoProject(gx, gy, 2);
    const mugData = [
      { dx: -18, color: 0xEF9F27, label: 'A' },
      { dx: -6,  color: 0x4a8a18, label: 'R' },
      { dx: 6,   color: 0xF4C0D1, label: 'P' },
      { dx: 18,  color: 0x7F77DD, label: 'Z' },
    ];
    mugData.forEach(({ dx, color, label }) => {
      g.fillStyle(color, 1);
      g.fillRect(x + dx - 4, y - 6, 8, 8);
      g.fillStyle(0x000000, 0.3);
      g.fillRect(x + dx - 3, y - 5, 6, 6);
      // Handle
      g.lineStyle(1.5, color, 1);
      g.strokeCircle(x + dx + 5, y - 2, 3);
      // Label
      this.add.text(x + dx, y - 2, label, {
        fontSize: '5px', fontFamily: 'Courier New', color: '#ffffff',
      }).setOrigin(0.5).setDepth(6);
    });
  }

  _drawFridge(g, gx, gy) {
    const { x, y } = this._isoProject(gx, gy, 1);
    g.fillStyle(0xcccccc, 1);
    g.fillRect(x - 10, y - 32, 20, 34);
    g.fillStyle(0xaaaaaa, 1);
    g.fillRect(x - 10, y - 32, 20, 16);
    g.lineStyle(1, 0x888888, 1);
    g.strokeRect(x - 10, y - 32, 20, 34);
    g.fillStyle(0x888888, 1);
    g.fillRect(x + 6, y - 26, 2, 6);
    g.fillRect(x + 6, y - 6, 2, 6);
  }

  _createAgents() {
    const spawnPositions = USE_BAKED_ENVIRONMENT
      ? Object.fromEntries(Object.entries(BAKED_AGENT_START).map(([name, spotKey]) => {
          const spot = BAKED_SPOTS[spotKey];
          return [name, { x: spot.x, y: spot.y, room: spot.room, pose: spot.pose || 'idle', spotKey }];
        }))
      : {
          ARLO: { ...this._isoProject(9,  2, 1), room: 'work', pose: 'idle' },
          REX:  { ...this._isoProject(11, 3, 1), room: 'work', pose: 'idle' },
          ZARA: { ...this._isoProject(9,  8, 1), room: 'kitchen', pose: 'idle' },
          PIP:  { ...this._isoProject(2,  3, 1), room: 'lounge', pose: 'idle' },
        };

    Object.entries(AGENTS).forEach(([name, data]) => {
      const pos = spawnPositions[name];
      const idleKey = this._agentTexture(name, 'idle');
      const usesGeneratedArt = USE_GENERATED_AGENT_ART && this.textures.exists(idleKey);
      const sprite = usesGeneratedArt
        ? this.add.image(pos.x, pos.y, idleKey)
        : this.add.sprite(pos.x, pos.y, name.toLowerCase(), 0);

      sprite.setDepth(10);
      sprite.setScale(usesGeneratedArt ? 0.28 : 1.5);
      sprite.setOrigin(0.5, 1);
      sprite.setName(name);
      sprite.setInteractive({ useHandCursor: true });
      sprite.on('pointerdown', () => this._showAgentFocus(name));

      // Idle bob tween
      this.tweens.add({
        targets: sprite, y: pos.y - 3,
        duration: 800 + Math.random() * 400,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });

      this.agents[name] = {
        sprite,
        pos: { ...pos },
        targetPos: null,
        room: pos.room || data.room,
        spotKey: pos.spotKey || null,
        targetSpotKey: null,
        usesGeneratedArt,
        walkTimer: null,
      };

      if (usesGeneratedArt && pos.pose) {
        this._setAgentPose(name, pos.pose);
      }
    });
  }

  _initDialogueUI() {
    const overlay = document.getElementById('dialogue-overlay');
    if (!overlay) return;

    this.dialogueUI = {
      overlay,
      close: document.getElementById('dialogue-close'),
      portraits: document.getElementById('dialogue-portraits'),
      mode: document.getElementById('dialogue-mode'),
      speaker: document.getElementById('dialogue-speaker'),
      line: document.getElementById('dialogue-line'),
      meta: document.getElementById('dialogue-meta'),
    };

    this.dialogueUI.close?.addEventListener('click', () => this._hideDialoguePanel());
  }

  _hideDialoguePanel() {
    if (!this.dialogueUI) return;
    this.dialogueUI.overlay.classList.add('hidden');
    this.activeDialogue = null;
  }

  _showAgentFocus(name) {
    const agent = this.agents[name];
    if (!agent) return;

    if (this.activeDialogue?.agents?.includes(name)) {
      this._renderDialoguePanel({
        agents: this.activeDialogue.agents,
        activeName: this.activeDialogue.activeName || name,
        mode: this._dialogueModeLabel(this.activeDialogue.type),
        speaker: this.activeDialogue.activeName || name,
        text: this.activeDialogue.text || '',
        meta: 'Conversación en curso',
        type: this.activeDialogue.type || 'work',
      });
      return;
    }

    const spot = BAKED_SPOTS[agent.spotKey] || BAKED_SPOTS[agent.targetSpotKey];
    const engine = window.dramaEngine;
    const needs = engine?.getNeeds(name);
    const status = spot?.status || document.getElementById(AGENTS[name].statusEl)?.textContent || 'working';
    const roomName = this._roomLabel(agent.room);
    const text = spot?.bubble || engine?.randomWorkLineForSpot(name, agent.spotKey) || ACTIVITY_BUBBLES[name]?.[0] || 'Trabajando...';
    const needsText = needs
      ? `Focus ${Math.round(needs.focus)} · Energía ${Math.round(needs.energy)} · Social ${Math.round(needs.social)} · Fun ${Math.round(needs.fun)}`
      : '';

    this._renderDialoguePanel({
      agents: [name],
      activeName: name,
      mode: 'Agente seleccionado',
      speaker: `${name} · ${AGENT_UI[name]?.role || 'Agente'}`,
      text,
      meta: `Estado: ${status} · Sala: ${roomName}${needsText ? ` · ${needsText}` : ''}`,
      type: engine?.getBubbleType(agent.spotKey) || 'work',
    });
  }

  _renderDialoguePanel({ agents, activeName, mode, speaker, text, meta, type = 'work' }) {
    if (!this.dialogueUI) return;

    const cfg = this._bubbleCfg(type);
    this.dialogueUI.overlay.classList.remove('hidden');
    this.dialogueUI.overlay.style.borderColor = this._cssColor(cfg.border);
    this.dialogueUI.mode.textContent = mode || '';
    this.dialogueUI.speaker.textContent = speaker || '';
    this.dialogueUI.speaker.style.color = AGENT_UI[activeName]?.accent || cfg.text;
    this.dialogueUI.line.textContent = text || '';
    this.dialogueUI.meta.textContent = meta || '';

    this.dialogueUI.portraits.innerHTML = '';
    agents.forEach(name => {
      const data = AGENT_UI[name] || {};
      const card = document.createElement('div');
      card.className = `dialogue-portrait${name === activeName ? ' active' : ''}`;
      card.style.borderColor = name === activeName ? data.accent || this._cssColor(cfg.border) : '#25254a';

      const img = document.createElement('img');
      img.src = data.portrait || '';
      img.alt = name;
      img.draggable = false;

      const label = document.createElement('div');
      label.className = 'dialogue-nameplate';
      label.textContent = name;

      card.append(img, label);
      this.dialogueUI.portraits.appendChild(card);
    });
  }

  _cssColor(value) {
    return `#${value.toString(16).padStart(6, '0')}`;
  }

  _dialogueModeLabel(type) {
    return {
      work:    '▣ Trabajo',
      social:  '◇ Conversación',
      drama:   '◆ Drama',
      leader:  '★ Dirección',
      romance: '♥ Romance',
      hoesik:  '🍶 Hoesik',
    }[type] || 'Diálogo';
  }

  _roomLabel(room) {
    return {
      work: 'Office',
      lounge: 'Lounge',
      gaming: 'Game Room',
      kitchen: 'Kitchen',
    }[room] || room || 'Oficina';
  }

  _agentTexture(name, pose) {
    const frames = GENERATED_AGENT_FRAMES[name];
    if (!frames) return name.toLowerCase();

    const frameByPose = {
      idle: frames[0],
      walk1: frames[1],
      walk2: frames[2],
      seated: frames[3],
      interact: frames[4],
      talk: frames[5],
    };

    return this._agentFrameKey(name, frameByPose[pose] || frameByPose.idle);
  }

  _setAgentPose(name, pose) {
    const agent = this.agents[name];
    if (!agent) return;

    if (!agent.usesGeneratedArt) {
      const frameByPose = {
        idle: 0,
        walk1: 1,
        walk2: 2,
        seated: 3,
        interact: 0,
        talk: 3,
      };
      agent.sprite.anims?.stop();
      agent.sprite.setFrame(frameByPose[pose] ?? 0);
      return;
    }

    const key = this._agentTexture(name, pose);
    if (this.textures.exists(key)) {
      agent.sprite.setTexture(key);
    }
  }

  _startWalkCycle(name) {
    const agent = this.agents[name];
    if (!agent) return;

    if (agent.walkTimer) {
      agent.walkTimer.remove(false);
      agent.walkTimer = null;
    }

    if (!agent.usesGeneratedArt) {
      agent.sprite.anims?.play?.(`${name.toLowerCase()}-walk`, true);
      return;
    }

    let step = 0;
    const poses = ['walk1', 'walk2'];
    this._setAgentPose(name, poses[step]);
    agent.walkTimer = this.time.addEvent({
      delay: 180,
      loop: true,
      callback: () => {
        step = (step + 1) % poses.length;
        this._setAgentPose(name, poses[step]);
      },
    });
  }

  _stopWalkCycle(name, finalPose = 'idle') {
    const agent = this.agents[name];
    if (!agent) return;

    if (agent.walkTimer) {
      agent.walkTimer.remove(false);
      agent.walkTimer = null;
    }
    this._setAgentPose(name, finalPose);
  }

  _createBubbles() {
    Object.keys(AGENTS).forEach(name => {
      const agent = this.agents[name];

      // All bubbles start HIDDEN — they appear only when the agent is active at a spot,
      // not during walking or idle without purpose.
      const container = this.add.container(agent.pos.x, agent.pos.y - 52);
      container.setDepth(20);
      container.setAlpha(0); // hidden by default

      const bg    = this.add.graphics();
      const label = this.add.text(0, 0, '', {
        fontSize: '8px',
        fontFamily: 'Courier New',
        color: '#e8e8ff',
        padding: { x: 5, y: 3 },
        wordWrap: { width: 140 },
      }).setOrigin(0.5);

      container.add([bg, label]);
      this.bubbles[name] = { container, label, bg, visible: false };
    });
  }

  // ── BUBBLE TYPE COLOURS ───────────────────────────────────────────────────
  // work=blue  social=green  drama=red  leader=gold
  _bubbleCfg(type) {
    return {
      work:   { bg: 0x030e1c, border: 0x007bff, text: '#c8e8ff' },
      social: { bg: 0x04150a, border: 0x28a745, text: '#c8ffd4' },
      drama:  { bg: 0x180406, border: 0xdc3545, text: '#ffc8cc' },
      leader: { bg: 0x140f00, border: 0xffd700, text: '#fff3a0' },
    }[type] ?? { bg: 0x0d0d1a, border: 0x1e1e3a, text: '#e8e8ff' };
  }

  // Show a bubble with animated fade-in, typed colour, optional tail
  _showBubble(name, text, type = 'work') {
    const bubble = this.bubbles[name];
    if (!bubble) return;

    this._renderBubble(name, text, type);

    this.tweens.killTweensOf(bubble.container);
    this.tweens.add({
      targets: bubble.container,
      alpha: 1,
      duration: 200,
      ease: 'Quad.easeOut',
    });
    bubble.visible = true;
  }

  // Hide with fade-out
  _hideBubble(name) {
    const bubble = this.bubbles[name];
    if (!bubble || !bubble.visible) return;

    this.tweens.killTweensOf(bubble.container);
    this.tweens.add({
      targets: bubble.container,
      alpha: 0,
      duration: 300,
      ease: 'Quad.easeIn',
      onComplete: () => { if (bubble) bubble.visible = false; },
    });
  }

  // Redraw bubble content + colour without changing visibility
  _renderBubble(name, text, type = 'work') {
    const bubble = this.bubbles[name];
    if (!bubble) return;

    const cfg = this._bubbleCfg(type);

    bubble.label.setText(text);
    bubble.label.setColor(cfg.text);

    bubble.bg.clear();
    const b = bubble.label.getBounds();
    const pw = b.width / 2 + 6, ph = b.height / 2 + 4;

    bubble.bg.fillStyle(cfg.bg, 0.95);
    bubble.bg.fillRoundedRect(-pw, -ph, pw * 2, ph * 2, 4);

    bubble.bg.lineStyle(1.5, cfg.border, 1);
    bubble.bg.strokeRoundedRect(-pw, -ph, pw * 2, ph * 2, 4);

    // Small downward tail pointing at the agent's head
    bubble.bg.fillStyle(cfg.border, 0.85);
    bubble.bg.fillTriangle(-4, ph, 4, ph, 0, ph + 6);
  }

  _startActivityCycles() {
    Object.keys(AGENTS).forEach((name, index) => {
      // Kick off quickly so the livestream immediately shows differentiated movement.
      this.time.delayedCall(1800 + index * 900, () => this._changeAgentActivity(name));
    });
  }

  _scheduleNextActivity(name) {
    const delay = Phaser.Math.Between(15000, 35000);
    this.agentTimers[name] = this.time.delayedCall(delay, () => {
      this._changeAgentActivity(name);
    });
  }

  _changeAgentActivity(name) {
    if (USE_BAKED_ENVIRONMENT) {
      this._changeBakedAgentActivity(name);
      return;
    }

    // Update bubble
    const bubbleTexts = ACTIVITY_BUBBLES[name];
    const newText = bubbleTexts[Math.floor(Math.random() * bubbleTexts.length)];
    this._updateBubble(name, newText);

    // Move agent toward new room
    const roomPositions = {
      work:    { gx: 9,  gy: 2 },
      lounge:  { gx: 2,  gy: 2 },
      gaming:  { gx: 2,  gy: 8 },
      kitchen: { gx: 9,  gy: 8 },
    };
    const rp = roomPositions[nextRoom];
    const targetPos = this._isoProject(rp.gx + Math.random() * 2, rp.gy + Math.random() * 2, 1);
    this._moveAgent(name, targetPos);

    // Update status bar
    const el = document.getElementById(AGENTS[name].statusEl);
    if (el) el.textContent = nextActivity;

    this._scheduleNextActivity(name);
  }

  _changeBakedAgentActivity(name) {
    const actionKeys = BAKED_AGENT_ACTIONS[name] || [];
    const agent = this.agents[name];
    if (!agent || actionKeys.length === 0) return;

    // Collect occupied spots (prefer not to stack agents at same spot)
    const occupiedSpots = new Set(
      Object.entries(this.agents)
        .filter(([n]) => n !== name)
        .map(([, a]) => a.targetSpotKey || a.spotKey)
        .filter(Boolean)
    );
    const preferredKeys = actionKeys.filter(k => !occupiedSpots.has(k) && k !== agent.spotKey);
    const fallbackKeys  = actionKeys.filter(k => k !== agent.spotKey);
    const candidateKeys = preferredKeys.length > 0 ? preferredKeys
      : fallbackKeys.length > 0 ? fallbackKeys : actionKeys;

    // Utility AI: pick spot that best satisfies current needs + personality
    const engine      = window.dramaEngine;
    const nextSpotKey = engine
      ? engine.pickNextSpot(name, candidateKeys, agent.spotKey)
      : candidateKeys[Math.floor(Math.random() * candidateKeys.length)];

    const spot        = BAKED_SPOTS[nextSpotKey];
    const bubbleType  = engine ? engine.getBubbleType(nextSpotKey) : 'work';
    const bubbleText  = engine
      ? engine.randomWorkLineForSpot(name, nextSpotKey)
      : (spot?.bubble || ACTIVITY_BUBBLES[name][0]);

    // Status bar update
    const el = document.getElementById(AGENTS[name].statusEl);
    if (el) el.textContent = spot?.status || 'working';

    this._moveAgentToSpot(name, nextSpotKey, bubbleText, bubbleType);
    this._scheduleNextActivity(name);
  }

  _moveAgent(name, targetPos) {
    const agent = this.agents[name];
    if (!agent) return;

    this.tweens.killTweensOf(agent.sprite);
    this._startWalkCycle(name);

    this.tweens.add({
      targets: agent.sprite,
      x: targetPos.x, y: targetPos.y,
      duration: 2200,
      ease: 'Power2.easeInOut',
      onUpdate: () => {
        if (this.bubbles[name]) {
          this.bubbles[name].container.setPosition(agent.sprite.x, agent.sprite.y - 40);
        }
      },
      onComplete: () => {
        agent.pos = { ...targetPos };
        const roomPose = this._poseForPosition(targetPos);
        this._stopWalkCycle(name, roomPose);
        // Resume idle bob
        this.tweens.add({
          targets: agent.sprite, y: targetPos.y - 3,
          duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
      },
    });
  }

  _moveAgentToSpot(name, spotKey, arrivalText = null, arrivalType = 'work') {
    const agent = this.agents[name];
    const spot  = BAKED_SPOTS[spotKey];
    if (!agent || !spot) return;

    agent.targetSpotKey = spotKey;
    this.tweens.killTweensOf(agent.sprite);

    // ── Hide bubble while walking ────────────────────────────────────────────
    this._hideBubble(name);

    this._startWalkCycle(name);

    const route = [];
    let prev = { x: agent.sprite.x, y: agent.sprite.y };
    this._routeToBakedSpot(agent, spot).forEach(pt => {
      if (this._distance(prev, pt) > 4) { route.push(pt); prev = pt; }
    });

    const walkNext = (index) => {
      const point = route[index];
      if (!point) {
        // ── Arrived at spot ──────────────────────────────────────────────────
        agent.pos = { x: spot.x, y: spot.y };
        agent.room = spot.room;
        agent.spotKey = spotKey;
        agent.targetSpotKey = null;

        this._stopWalkCycle(name, spot.pose || 'idle');
        this._setBubblePosition(name);

        // Satisfy needs via smart object advertisement
        window.dramaEngine?.satisfySpot(name, spotKey);

        // Show typed bubble with arrival text
        const text = arrivalText || spot.bubble || ACTIVITY_BUBBLES[name][0];
        const type = arrivalType;
        this.time.delayedCall(120, () => this._showBubble(name, text, type));

        this.tweens.add({
          targets: agent.sprite,
          y: spot.y - 3,
          duration: 800,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        return;
      }

      const dist = this._distance(agent.sprite, point);
      this.tweens.add({
        targets: agent.sprite,
        x: point.x,
        y: point.y,
        duration: Phaser.Math.Clamp(dist * 9, 350, 1500),
        ease: 'Sine.easeInOut',
        onUpdate: () => this._setBubblePosition(name),
        onComplete: () => walkNext(index + 1),
      });
    };

    walkNext(0);
  }

  _routeToBakedSpot(agent, spot) {
    const target = { x: spot.x, y: spot.y };
    const fromSpot = agent.spotKey ? BAKED_SPOTS[agent.spotKey] : null;
    const fromApproach = this._spotApproach(fromSpot) || { x: agent.sprite.x, y: agent.sprite.y };
    const toApproach = this._spotApproach(spot) || target;

    if (agent.room === spot.room) {
      const roomAisles = BAKED_ROOM_AISLES[spot.room] || [];
      return [fromApproach, ...roomAisles, toApproach, target];
    }

    const fromExit = BAKED_TRANSIT[agent.room] || { x: agent.sprite.x, y: agent.sprite.y };
    const toExit = BAKED_TRANSIT[spot.room] || target;
    const pair = `${agent.room}:${spot.room}`;

    const bridges = {
      'lounge:work': [BAKED_TRANSIT.hub_west, BAKED_TRANSIT.hub_south_west, BAKED_TRANSIT.hub_south, BAKED_TRANSIT.hub_south_east, BAKED_TRANSIT.hub_east],
      'work:lounge': [BAKED_TRANSIT.hub_east, BAKED_TRANSIT.hub_south_east, BAKED_TRANSIT.hub_south, BAKED_TRANSIT.hub_south_west, BAKED_TRANSIT.hub_west],
      'lounge:gaming': [BAKED_TRANSIT.hub_west],
      'gaming:lounge': [BAKED_TRANSIT.hub_west],
      'work:kitchen': [BAKED_TRANSIT.hub_east],
      'kitchen:work': [BAKED_TRANSIT.hub_east],
      'gaming:kitchen': [BAKED_TRANSIT.hub_south_west, BAKED_TRANSIT.hub_south, BAKED_TRANSIT.hub_south_east],
      'kitchen:gaming': [BAKED_TRANSIT.hub_south_east, BAKED_TRANSIT.hub_south, BAKED_TRANSIT.hub_south_west],
      'lounge:kitchen': [BAKED_TRANSIT.hub_west, BAKED_TRANSIT.hub_south_west, BAKED_TRANSIT.hub_south, BAKED_TRANSIT.hub_south_east],
      'kitchen:lounge': [BAKED_TRANSIT.hub_south_east, BAKED_TRANSIT.hub_south, BAKED_TRANSIT.hub_south_west, BAKED_TRANSIT.hub_west],
      'work:gaming': [BAKED_TRANSIT.hub_east, BAKED_TRANSIT.hub_south_east, BAKED_TRANSIT.hub_south, BAKED_TRANSIT.hub_south_west],
      'gaming:work': [BAKED_TRANSIT.hub_south_west, BAKED_TRANSIT.hub_south, BAKED_TRANSIT.hub_south_east, BAKED_TRANSIT.hub_east],
    };

    return [fromApproach, fromExit, ...(bridges[pair] || [BAKED_TRANSIT.hub_south]), toExit, toApproach, target];
  }

  _spotApproach(spot) {
    if (!spot) return null;
    return spot.approach || { x: spot.x, y: spot.y };
  }

  _distance(from, to) {
    return Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y);
  }

  _setBubblePosition(name) {
    const agent  = this.agents[name];
    const bubble = this.bubbles[name];
    if (agent && bubble) {
      bubble.container.setPosition(agent.sprite.x, agent.sprite.y - 52);
    }
  }

  // ── MULTI-AGENT DRAMA CONVERSATION ───────────────────────────────────────
  // lines = [{ agent, text }, ...]  type = 'work' | 'social' | 'drama' | 'leader'
  _playConversation(agents, lines, type) {
    agents.forEach(name => this._hideBubble(name));

    this.activeDialogue = {
      agents, lines, type,
      activeName: lines[0]?.agent || agents[0],
      text: lines[0]?.text || '',
    };

    // ── Route through visual novel viewer when available ──────────────────
    const viewer = window.dialogueViewer;
    if (viewer) {
      viewer.play(agents, lines, type, () => {
        // On finish: restore work bubbles and clear panel
        this._afterConversation(agents, lines);
      });
      // Mirror active speaker to sprite poses while viewer is playing
      this._mirrorDialogueViewerPoses(agents, lines);
      return;
    }

    // ── Fallback: legacy time.delayedCall loop ────────────────────────────
    let delay = 0;
    const PER_LINE_MS = 3400;

    lines.forEach(({ agent: name, text }, index) => {
      this.time.delayedCall(delay, () => {
        if (!this.agents[name]) return;
        this.activeDialogue = { agents, lines, type, activeName: name, text };
        this._renderDialoguePanel({
          agents,
          activeName: name,
          mode: `${this._dialogueModeLabel(type)} ${index + 1}/${lines.length}`,
          speaker: `${name} · ${AGENT_UI[name]?.role || 'Agente'}`,
          text,
          meta: agents.length > 1 ? agents.join(' + ') : 'Monólogo',
          type,
        });
        agents.forEach(agentName => {
          if (this.agents[agentName]?.usesGeneratedArt) {
            this._setAgentPose(agentName, agentName === name ? 'talk' : (BAKED_SPOTS[this.agents[agentName].spotKey]?.pose || 'idle'));
          }
        });
      });
      delay += PER_LINE_MS;
    });

    this.time.delayedCall(delay + 1500, () => {
      this._afterConversation(agents, lines);
    });
  }

  // Restore agent state after a conversation finishes
  _afterConversation(agents, lines) {
    agents.forEach(name => {
      if (this.agents[name] && this.bubbles[name]?.visible) {
        const engine  = window.dramaEngine;
        const spotKey = this.agents[name].spotKey;
        const txt     = engine ? engine.randomWorkLineForSpot(name, spotKey) : '';
        const tp      = engine ? engine.getBubbleType(spotKey) : 'work';
        if (txt) this._renderBubble(name, txt, tp);
        else     this._hideBubble(name);
      }
    });
    if (this.activeDialogue?.lines === lines) {
      this.activeDialogue = null;
      this.time.delayedCall(2500, () => {
        if (!this.activeDialogue) this._hideDialoguePanel();
      });
    }
  }

  // Drive sprite poses in sync with dialogueViewer timing
  _mirrorDialogueViewerPoses(agents, lines) {
    const PER_LINE_MS = 2800; // approx match viewer timing
    lines.forEach(({ agent: name }, index) => {
      this.time.delayedCall(index * PER_LINE_MS, () => {
        agents.forEach(agentName => {
          if (this.agents[agentName]?.usesGeneratedArt) {
            this._setAgentPose(agentName,
              agentName === name ? 'talk'
              : (BAKED_SPOTS[this.agents[agentName].spotKey]?.pose || 'idle')
            );
          }
        });
      });
    });
  }

  _poseForPosition(pos) {
    if (pos.y < 260) return 'interact';
    if (pos.y > 430) return 'seated';
    return 'idle';
  }

  // Legacy: called by triggerArloTalk — routes through typed system
  _updateBubble(name, text, type = null) {
    const engine      = window.dramaEngine;
    const personality = engine?.getPersonality(name);
    const bubbleType  = type ?? personality?.bubbleType ?? 'work';
    this._showBubble(name, text, bubbleType);
  }

  // Called by chat.js when ARLO responds
  triggerArloTalk(responseText) {
    this._updateBubble('ARLO', responseText.slice(0, 80) + (responseText.length > 80 ? '...' : ''));

    const agent = this.agents['ARLO'];
    if (!agent) return;
    this._setAgentPose('ARLO', 'talk');

    // Flash bubble
    if (this.bubbles['ARLO']) {
      this.tweens.add({
        targets: this.bubbles['ARLO'].container,
        scaleX: 1.08, scaleY: 1.08,
        duration: 200, yoyo: true, repeat: 2,
      });
    }

    // Return to idle after 5s
    this.time.delayedCall(5000, () => {
      const defaultTexts = ACTIVITY_BUBBLES['ARLO'];
      this._updateBubble('ARLO', defaultTexts[Math.floor(Math.random() * defaultTexts.length)]);
      this._setAgentPose('ARLO', 'idle');
    });
  }

  update(time, delta) {
    // Depth-sort agents by Y for correct isometric overlap
    Object.values(this.agents).forEach(a => a.sprite.setDepth(10 + a.sprite.y / 100));

    // Tick needs decay
    const engine = window.dramaEngine;
    if (engine) {
      engine.tick(delta);

      // Check for drama event every ~5 s (avoids per-frame overhead)
      this._dramaTimer = (this._dramaTimer || 0) + delta;
      if (this._dramaTimer >= 5000) {
        this._dramaTimer = 0;
        engine.tryDrama(time);
      }
    }
  }
}

// Boot Phaser
const phaserConfig = {
  type: Phaser.AUTO,
  width: GAME_W,
  height: GAME_H,
  parent: 'game-container',
  backgroundColor: 'rgba(0,0,0,0)',
  transparent: true,
  scene: OfficeScene,
  render: {
    antialias: false,
    pixelArt: true,
    roundPixels: true,
  },
  fps: { target: 60, forceSetTimeOut: false },
};

window.phaserGame = new Phaser.Game(phaserConfig);
