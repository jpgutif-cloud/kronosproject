/* dialogue.js — Visual Novel-style dialogue viewer
 * Controls #dialogue-overlay already scaffolded in index.html.
 * Exposed as window.dialogueViewer — call .play(agents, lines, type, onDone)
 */
'use strict';

const _AGENT_COLORS = {
  ARLO: '#EF9F27',
  REX:  '#3B6D11',
  PIP:  '#F4C0D1',
  ZARA: '#7F77DD',
};

const _AGENT_LABEL = {
  ARLO: 'ARLO · Orquestador',
  REX:  'REX · Investigador',
  PIP:  'PIP · Reportero',
  ZARA: 'ZARA · Ejecutora',
};

const _AGENT_PORTRAITS = {
  ARLO: 'sprites/generated/portraits/arlo.png',
  REX:  'sprites/generated/portraits/rex.png',
  PIP:  'sprites/generated/portraits/pip.png',
  ZARA: 'sprites/generated/portraits/zara.png',
};

const _TYPE_LABEL = {
  drama:   '◆ DRAMA',
  social:  '◇ SOCIAL',
  leader:  '★ LIDERAZGO',
  work:    '▣ TRABAJO',
  romance: '♥ ROMANCE',
  hoesik:  '🍶 HOESIK',
};

const _TYPE_BORDER = {
  drama:   '#7F77DD',
  social:  '#3B6D11',
  leader:  '#EF9F27',
  work:    '#00d4ff',
  romance: '#F4C0D1',
  hoesik:  '#EF9F27',
};

// ── Agent portrait block ─────────────────────────────────────────────────────

function _buildPortraitEl(name) {
  const c = _AGENT_COLORS[name] ?? '#888';

  const wrap = document.createElement('div');
  wrap.className = 'dialogue-portrait';
  wrap.dataset.agent = name;

  const img = document.createElement('img');
  img.src = _AGENT_PORTRAITS[name] ?? '';
  img.alt = name;
  img.draggable = false;

  const nameTag = document.createElement('div');
  nameTag.className = 'dialogue-nameplate';
  nameTag.style.color = c;
  nameTag.textContent = name;

  wrap.appendChild(img);
  wrap.appendChild(nameTag);
  return wrap;
}

// ── DialogueViewer class ──────────────────────────────────────────────────────

class DialogueViewer {
  constructor() {
    this._overlay   = document.getElementById('dialogue-overlay');
    this._portraitW = document.getElementById('dialogue-portraits');
    this._modeEl    = document.getElementById('dialogue-mode');
    this._speakEl   = document.getElementById('dialogue-speaker');
    this._lineEl    = document.getElementById('dialogue-line');
    this._metaEl    = document.getElementById('dialogue-meta');
    this._closeBtn  = document.getElementById('dialogue-close');

    this._queue     = [];
    this._playing   = false;
    this._typeTimer = null;
    this._lineTimer = null;
    this._onDone    = null;
    this._pending   = '';  // full text being typed

    this._closeBtn?.addEventListener('click', () => this.skip());
    this._lineEl?.addEventListener('click',   () => this._advance());

    // Border color reacts to drama type
    this._overlay && (this._overlay.style.borderColor = '#2a2a52');
  }

  // ── PUBLIC API ─────────────────────────────────────────────────────────────

  /**
   * @param {string[]} agents   names of agents in the scene
   * @param {{ agent:string, text:string }[]} lines
   * @param {string} type       drama|social|leader|work|romance|hoesik
   * @param {Function|null} onDone
   */
  play(agents, lines, type, onDone) {
    // If already playing, queue after current finishes
    if (this._playing) {
      const prev = this._onDone;
      this._onDone = () => {
        prev?.();
        this.play(agents, lines, type, onDone);
      };
      return;
    }

    this._queue   = [...lines];
    this._agents  = agents;
    this._type    = type;
    this._onDone  = onDone ?? null;
    this._playing = true;

    this._buildPortraits(agents);
    this._setMode(type);
    this._overlay?.classList.remove('hidden');
    this._playNext();
  }

  /** Skip the entire conversation immediately */
  skip() {
    this._clearTimers();
    this._queue = [];
    this._finish();
  }

  get isPlaying() { return this._playing; }

  // ── PRIVATE ────────────────────────────────────────────────────────────────

  _advance() {
    // If typewriter is mid-text, complete instantly then pause
    if (this._typeTimer) {
      this._clearTimers();
      if (this._lineEl) this._lineEl.textContent = this._pending;
      this._lineTimer = setTimeout(() => this._playNext(), 600);
      return;
    }
    // Otherwise skip to next line immediately
    this._clearTimers();
    this._playNext();
  }

  _playNext() {
    this._clearTimers();
    if (!this._queue.length) { this._finish(); return; }

    const { agent, text } = this._queue.shift();
    this._setActiveSpeaker(agent);
    this._setSpeakerInfo(agent);
    this._typeLine(text, () => {
      // Auto-advance after delay proportional to line length
      const delay = Math.min(2800, 1000 + text.length * 40);
      this._lineTimer = setTimeout(() => this._playNext(), delay);
    });
  }

  _typeLine(text, onDone) {
    if (!this._lineEl) { onDone?.(); return; }
    this._pending = text;
    this._lineEl.textContent = '';
    let i = 0;
    const speed = 25; // ms per character
    const tick = () => {
      if (i >= text.length) { this._typeTimer = null; onDone?.(); return; }
      this._lineEl.textContent += text[i++];
      this._typeTimer = setTimeout(tick, speed);
    };
    tick();
  }

  _finish() {
    this._playing = false;
    this._overlay?.classList.add('hidden');
    const cb = this._onDone;
    this._onDone = null;
    cb?.();
  }

  // ── DOM helpers ────────────────────────────────────────────────────────────

  _buildPortraits(agents) {
    if (!this._portraitW) return;
    this._portraitW.innerHTML = '';
    agents.forEach(name => {
      this._portraitW.appendChild(_buildPortraitEl(name));
    });
  }

  _setActiveSpeaker(agent) {
    this._portraitW?.querySelectorAll('.dialogue-portrait').forEach(el => {
      el.classList.toggle('active', el.dataset.agent === agent);
    });
  }

  _setSpeakerInfo(agent) {
    const color = _AGENT_COLORS[agent] ?? '#EF9F27';
    if (this._speakEl) {
      this._speakEl.textContent = _AGENT_LABEL[agent] ?? agent;
      this._speakEl.style.color = color;
    }
  }

  _setMode(type) {
    if (this._modeEl) {
      this._modeEl.textContent = _TYPE_LABEL[type] ?? type.toUpperCase();
    }
    // Tint overlay border
    if (this._overlay) {
      this._overlay.style.borderColor = _TYPE_BORDER[type] ?? '#2a2a52';
    }
    if (this._metaEl) this._metaEl.textContent = '';
  }

  _clearTimers() {
    if (this._typeTimer) { clearTimeout(this._typeTimer); this._typeTimer = null; }
    if (this._lineTimer) { clearTimeout(this._lineTimer); this._lineTimer = null; }
  }
}

window.dialogueViewer = new DialogueViewer();
