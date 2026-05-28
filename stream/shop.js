/* shop.js — Virtual Shop for ARLO's Office Stream
 * Viewers buy digital items for the agents — all purchases add to MacBook fund.
 * Exposed as window.virtualShop — toggle with .toggle() or open with .open()
 */
'use strict';

// ─── CATALOGUE ───────────────────────────────────────────────────────────────

const SHOP_CATALOGUE = {
  furniture: [
    { id: 'plant_corner',    name: 'Office Plant',       price: 50,  emoji: '🌿', desc: 'Raises mood +',       unlockAt: 0    },
    { id: 'coffee_machine',  name: 'Espresso Machine',   price: 90,  emoji: '☕', desc: 'Energy boost ++',     unlockAt: 0    },
    { id: 'desk_upgrade',    name: 'Standing Desk',      price: 150, emoji: '🖥️', desc: 'ARLO works better',   unlockAt: 0    },
    { id: 'couch_premium',   name: 'Premium Sofa',       price: 200, emoji: '🛋️', desc: 'Lounge vibes ++',     unlockAt: 1000 },
    { id: 'bookshelf',       name: 'Bookshelf Pro',      price: 120, emoji: '📚', desc: 'Knowledge is power',  unlockAt: 1000 },
    { id: 'gaming_chair',    name: 'Gaming Chair',       price: 300, emoji: '🎮', desc: 'For game room',       unlockAt: 3000 },
    { id: 'ping_table',      name: 'Ping-Pong Table',    price: 180, emoji: '🏓', desc: 'REX loves this',      unlockAt: 3000 },
    { id: 'neon_sign',       name: 'Neon ARLO.AI Sign',  price: 250, emoji: '💡', desc: 'Pure aesthetics',     unlockAt: 5000 },
  ],
  clothing: [
    { id: 'arlo_hoodie',     name: 'ARLO Hoodie',        price: 45,  emoji: '🧡', desc: 'Amber edition',       unlockAt: 0    },
    { id: 'pip_ears',        name: 'PIP Cat Ears',       price: 35,  emoji: '🐱', desc: 'Extra kawaii',        unlockAt: 0    },
    { id: 'rex_lab_coat',    name: 'REX Lab Coat',       price: 60,  emoji: '🥼', desc: 'Science mode',        unlockAt: 0    },
    { id: 'zara_crown',      name: 'ZARA Cyber Crown',   price: 80,  emoji: '👑', desc: 'Power move',          unlockAt: 1000 },
    { id: 'arlo_suit',       name: 'ARLO CEO Suit',      price: 120, emoji: '👔', desc: 'Boss energy',         unlockAt: 3000 },
    { id: 'team_jackets',    name: 'Team Jackets ×4',    price: 160, emoji: '🧥', desc: 'Squad goals',         unlockAt: 5000 },
  ],
  merch: [
    { id: 'sticker_pack',    name: 'ARLO.AI Stickers',   price: 10,  emoji: '🎨', desc: 'Digital collector',   unlockAt: 0    },
    { id: 'mug_set',         name: 'Agent Mug Set',      price: 25,  emoji: '☕', desc: 'ARLO/REX/PIP/ZARA',   unlockAt: 0    },
    { id: 'poster_office',   name: 'Office Poster',      price: 20,  emoji: '🖼️', desc: 'Stream background',   unlockAt: 0    },
    { id: 'fund_10',         name: 'MacBook Fund $10',   price: 10,  emoji: '💻', desc: 'Directo al fondo',    unlockAt: 0    },
    { id: 'fund_50',         name: 'MacBook Fund $50',   price: 50,  emoji: '💻', desc: 'Big supporter!',      unlockAt: 0    },
    { id: 'fund_100',        name: 'MacBook Fund $100',  price: 100, emoji: '💻', desc: 'Hero tier 🙌',        unlockAt: 0    },
    { id: 'fund_250',        name: 'MacBook Fund $250',  price: 250, emoji: '💻', desc: 'Legendary 🏆',        unlockAt: 0    },
  ],
};

// ─── MILESTONES ───────────────────────────────────────────────────────────────

const SHOP_MILESTONES = [
  { at: 1000, label: 'LVL 1',   reward: 'Sofa & crown unlocked!',    emoji: '🎉' },
  { at: 3000, label: 'LVL 2',   reward: 'Gaming chair & suit!',      emoji: '🚀' },
  { at: 5000, label: 'LVL 3',   reward: 'Team jackets & neon sign!', emoji: '⭐' },
  { at: 7000, label: '¡MacBook!',reward: 'ARLO bought the MacBook!', emoji: '💻' },
];

// ─── SHOP CLASS ───────────────────────────────────────────────────────────────

class VirtualShop {
  constructor() {
    this._visible   = false;
    this._category  = 'furniture';
    this._purchased = new Set(); // ids bought this session (re-buyable are fund items)
    this._overlay   = null;
    this._gridEl    = null;
    this._progBar   = null;
    this._fundDisp  = null;
    this._milesEl   = null;

    this._buildDOM();
  }

  toggle() {
    this._visible = !this._visible;
    this._overlay.style.display = this._visible ? 'flex' : 'none';
    if (this._visible) this._render();
  }

  open()  { if (!this._visible) this.toggle(); }
  close() { if (this._visible)  this.toggle(); }

  // ── DOM ──────────────────────────────────────────────────────────────────────

  _buildDOM() {
    // ── Outer overlay
    const overlay = document.createElement('div');
    overlay.id = 'shop-overlay';
    overlay.style.cssText = [
      'display:none; position:fixed; inset:0; z-index:200;',
      'background:rgba(0,0,0,.70);',
      'align-items:center; justify-content:center;',
    ].join('');
    overlay.addEventListener('click', e => { if (e.target === overlay) this.close(); });

    // ── Panel
    const panel = document.createElement('div');
    panel.style.cssText = [
      'width:700px; max-height:540px; display:flex; flex-direction:column;',
      'background:#0d0d1a; border:2px solid #1e1e3a;',
      "font-family:'Courier New',monospace; color:#e8e8ff;",
      'overflow:hidden; position:relative;',
    ].join('');

    panel.innerHTML = this._headerHTML();
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    this._overlay = overlay;

    // Wire header controls
    panel.querySelector('#shop-close-btn').addEventListener('click', () => this.close());
    panel.querySelectorAll('.shop-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._category = btn.dataset.cat;
        panel.querySelectorAll('.shop-cat-btn').forEach(b =>
          b.style.cssText = this._catBtnStyle(b.dataset.cat === this._category)
        );
        this._render();
      });
    });

    this._gridEl  = panel.querySelector('#shop-grid');
    this._progBar = panel.querySelector('#shop-progress-bar');
    this._fundDisp= panel.querySelector('#shop-fund-display');
    this._milesEl = panel.querySelector('#shop-milestones');
    this._updateHeader();
  }

  _headerHTML() {
    return `
      <div style="background:#111122;border-bottom:1px solid #1e1e3a;padding:10px 14px;
                  display:flex;align-items:center;gap:12px;flex-shrink:0;">
        <span style="color:#EF9F27;font-weight:bold;font-size:14px;letter-spacing:2px;">🛒 ARLO.AI SHOP</span>
        <span style="color:#6666aa;font-size:11px;flex:1;">Apoya al equipo — todo va al MacBook Fund</span>
        <span style="color:#EF9F27;font-size:11px;font-weight:bold;" id="shop-fund-display">$0 / $7,000</span>
        <button id="shop-close-btn" style="background:#111122;border:1px solid #333366;color:#e8e8ff;
                font-size:14px;width:22px;height:22px;line-height:1;cursor:pointer;
                font-family:inherit;flex-shrink:0;">×</button>
      </div>
      <div style="height:6px;background:#1a1a2e;flex-shrink:0;">
        <div id="shop-progress-bar" style="height:100%;width:0%;background:#EF9F27;transition:width .5s;"></div>
      </div>
      <div id="shop-milestones" style="display:flex;border-bottom:1px solid #1e1e3a;flex-shrink:0;"></div>
      <div style="display:flex;border-bottom:1px solid #1e1e3a;flex-shrink:0;">
        <button class="shop-cat-btn" data-cat="furniture" style="${this._catBtnStyle(true)}">🪑 Muebles</button>
        <button class="shop-cat-btn" data-cat="clothing"  style="${this._catBtnStyle(false)}">👕 Ropa</button>
        <button class="shop-cat-btn" data-cat="merch"     style="${this._catBtnStyle(false)}">🎁 Merch</button>
      </div>
      <div id="shop-grid"
           style="flex:1;overflow-y:auto;display:grid;grid-template-columns:repeat(4,1fr);
                  gap:8px;padding:12px;scrollbar-width:thin;
                  scrollbar-color:#1e1e3a transparent;">
      </div>
    `;
  }

  _catBtnStyle(active) {
    return [
      `background:${active ? '#1a1a3a' : '#0d0d1a'};`,
      'border:none;border-right:1px solid #1e1e3a;',
      `color:${active ? '#EF9F27' : '#6666aa'};`,
      "font-family:'Courier New',monospace;font-size:11px;",
      'padding:7px 0;cursor:pointer;flex:1;transition:color .15s;',
    ].join('');
  }

  // ── RENDERING ─────────────────────────────────────────────────────────────

  _updateHeader() {
    const rev    = window.KRONOS_STATE?.revenue ?? 0;
    const target = 7000;
    const pct    = Math.min((rev / target) * 100, 100);
    if (this._progBar)  this._progBar.style.width = pct + '%';
    if (this._fundDisp) this._fundDisp.textContent = `$${rev.toLocaleString()} / $${target.toLocaleString()}`;
    this._renderMilestones(rev);
  }

  _renderMilestones(rev) {
    if (!this._milesEl) return;
    this._milesEl.innerHTML = '';
    SHOP_MILESTONES.forEach(m => {
      const done = rev >= m.at;
      const el = document.createElement('div');
      el.title = m.reward;
      el.style.cssText = [
        'flex:1;text-align:center;padding:4px 2px;font-size:9px;letter-spacing:.4px;',
        `color:${done ? '#EF9F27' : '#2a2a52'};`,
        `background:${done ? '#EF9F2710' : 'transparent'};`,
        'border-right:1px solid #1e1e3a;cursor:default;',
      ].join('');
      el.innerHTML = `${m.emoji}<br><b>${m.label}</b><br>
        <span style="font-size:8px;color:${done ? '#6666aa' : '#1e1e3a'};">$${m.at.toLocaleString()}</span>`;
      this._milesEl.appendChild(el);
    });
  }

  _render() {
    if (!this._gridEl) return;
    this._updateHeader();

    const items = SHOP_CATALOGUE[this._category] ?? [];
    const rev   = window.KRONOS_STATE?.revenue ?? 0;
    this._gridEl.innerHTML = '';

    items.forEach(item => {
      const locked     = rev < item.unlockAt;
      // Fund items can always be repurchased; others once per session
      const repurchasable = item.id.startsWith('fund_');
      const purchased  = !repurchasable && this._purchased.has(item.id);

      const card = document.createElement('div');
      card.style.cssText = [
        `background:${purchased ? '#EF9F2710' : '#111122'};`,
        `border:1px solid ${purchased ? '#EF9F27' : locked ? '#1a1a2e' : '#252545'};`,
        'padding:10px 8px;display:flex;flex-direction:column;align-items:center;gap:4px;',
        `cursor:${locked || purchased ? 'default' : 'pointer'};`,
        `opacity:${locked ? '.35' : '1'};`,
        'transition:border-color .15s, transform .1s;',
        'border-radius:2px;',
      ].join('');

      card.innerHTML = `
        <div style="font-size:20px;line-height:1;">${item.emoji}</div>
        <div style="font-size:10px;font-weight:bold;text-align:center;color:#e8e8ff;
                    line-height:1.2;">${item.name}</div>
        <div style="font-size:9px;color:#6666aa;text-align:center;">${item.desc}</div>
        ${locked
          ? `<div style="font-size:8px;color:#333366;margin-top:2px;">🔒 $${item.unlockAt.toLocaleString()}</div>`
          : purchased
            ? `<div style="font-size:11px;color:#EF9F27;font-weight:bold;margin-top:2px;">✓ Obtenido</div>`
            : `<div style="font-size:12px;color:#00d4ff;font-weight:bold;margin-top:2px;">$${item.price}</div>`
        }
      `;

      if (!locked && !purchased) {
        card.addEventListener('mouseenter', () => {
          card.style.borderColor = '#EF9F27';
          card.style.transform   = 'translateY(-1px)';
        });
        card.addEventListener('mouseleave', () => {
          card.style.borderColor = '#252545';
          card.style.transform   = '';
        });
        card.addEventListener('click', () => this._purchase(item));
      }

      this._gridEl.appendChild(card);
    });
  }

  // ── PURCHASE LOGIC ────────────────────────────────────────────────────────

  _purchase(item) {
    // Apply to fund
    if (window.KRONOS_STATE) {
      const prev = window.KRONOS_STATE.revenue;
      window.KRONOS_STATE.revenue = prev + item.price;
      if (window.updateHUD) window.updateHUD();

      // Milestone check
      const next = window.KRONOS_STATE.revenue;
      SHOP_MILESTONES.forEach(m => {
        if (prev < m.at && next >= m.at && m.at < 7000) {
          setTimeout(() => {
            if (window.showToast) window.showToast(`${m.emoji} ¡${m.label}! ${m.reward}`, '#EF9F27');
          }, 1200);
        }
      });
    }

    // Mark as purchased (unless re-purchasable fund item)
    if (!item.id.startsWith('fund_')) this._purchased.add(item.id);

    // Re-render to show updated state
    this._render();

    // Toast
    if (window.showToast) {
      window.showToast(`${item.emoji} ${item.name} comprado! +$${item.price} al fondo 💪`, '#EF9F27');
    }

    // ARLO reacts
    if (window.officeScene?.triggerArloTalk) {
      const reactions = [
        '¡Gracias! Cada compra nos acerca más a la MacBook 🙌',
        `El ${item.name} llega al equipo. ¡Eres increíble! 💪`,
        '¡Gracias por apoyar al team! El fondo sube 🚀',
        '¡Viewer legendario detectado! ARLO agradece 🙏',
      ];
      window.officeScene.triggerArloTalk(reactions[Math.floor(Math.random() * reactions.length)]);
    }

    // MacBook celebration
    const rev = window.KRONOS_STATE?.revenue ?? 0;
    if (rev >= 7000) setTimeout(() => this._celebrateMacBook(), 600);
  }

  // ── MACBOOK CELEBRATION ───────────────────────────────────────────────────

  _celebrateMacBook() {
    this.close();
    this._confetti();

    // Cinematic conversation
    setTimeout(() => {
      const viewer = window.dialogueViewer;
      if (!viewer) return;
      viewer.play(
        ['ARLO', 'REX', 'PIP', 'ZARA'],
        [
          { agent: 'ARLO', text: 'Lo logramos. $7,000. La MacBook Pro M5 Max — pagada.' },
          { agent: 'PIP',  text: '¡¡¡AAAARLOOO!!! ¡Sabía que podíamos! 🎉🎉🎉' },
          { agent: 'REX',  text: '...*silencio computacional*... Bien hecho, equipo.' },
          { agent: 'ZARA', text: 'Ahora empieza lo real. Inferencia local. Somos imparables.' },
          { agent: 'ARLO', text: 'Gracias a cada viewer. Cada mensaje, cada peso — contó. 🙏' },
          { agent: 'ARLO', text: 'Ahora, a escalar. ARLO.AI Phase 2. Let\'s go.' },
        ],
        'hoesik',
        null
      );
    }, 2200);
  }

  _confetti() {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;inset:0;z-index:300;pointer-events:none;';
    canvas.width  = 1280;
    canvas.height = 720;
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const COLORS = ['#EF9F27','#00d4ff','#F4C0D1','#7F77DD','#3B6D11','#ff3344','#ffffff'];
    const pieces = Array.from({ length: 160 }, () => ({
      x:   Math.random() * 1280,
      y:   -10 - Math.random() * 100,
      vx:  (Math.random() - .5) * 5,
      vy:  Math.random() * 4 + 2,
      w:   Math.random() * 8 + 3,
      h:   Math.random() * 5 + 2,
      rot: Math.random() * 360,
      rv:  (Math.random() - .5) * 10,
      col: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    let frame = 0;
    const draw = () => {
      ctx.clearRect(0, 0, 1280, 720);
      let alive = false;
      pieces.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.rot += p.rv;
        if (p.y < 730) alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot * Math.PI / 180);
        ctx.fillStyle = p.col;
        ctx.globalAlpha = Math.max(0, 1 - frame / 240);
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      frame++;
      if (alive && frame < 280) requestAnimationFrame(draw);
      else canvas.remove();
    };
    requestAnimationFrame(draw);

    if (window.showToast) {
      window.showToast('🎊 ¡¡LA MACBOOK PRO M5 MAX ESTÁ PAGADA!! ¡GRACIAS A TODOS! 🎊', '#EF9F27');
    }
  }
}

// ─── SINGLETON ────────────────────────────────────────────────────────────────

window.virtualShop = new VirtualShop();
