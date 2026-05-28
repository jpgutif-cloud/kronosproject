/* stats.js — Revenue tracker and HUD updates */

const STATE = {
  revenue: 0,
  target: 7000,
  day: 1,
  phase: 'BOOTSTRAP',
  clients: 0,
  emailsSent: 0,
  responses: 0,
};

function updateHUD() {
  // Revenue milestone detection — feeds the drama engine's chapter system
  const prevRevenue = STATE._prevRevenue ?? 0;
  if (STATE.revenue !== prevRevenue && window.dramaEngine?.onRevenueMilestone) {
    window.dramaEngine.onRevenueMilestone(prevRevenue, STATE.revenue);
  }
  STATE._prevRevenue = STATE.revenue;

  // Day change hook
  const prevDay = STATE._prevDay ?? 0;
  if (STATE.day !== prevDay && window.dramaEngine?.onDayChange) {
    window.dramaEngine.onDayChange(STATE.day);
  }
  STATE._prevDay = STATE.day;

  const pct = Math.min((STATE.revenue / STATE.target) * 100, 100);

  const fundBarTop = document.getElementById('fund-bar-top');
  const fundTextTop = document.getElementById('fund-text-top');
  const miniBar = document.getElementById('mini-bar');
  const statRevenue = document.getElementById('stat-revenue');
  const statDay = document.getElementById('stat-day');
  const statClients = document.getElementById('stat-clients');
  const statEmails = document.getElementById('stat-emails');
  const phaseBadge = document.getElementById('phase-badge');

  if (fundBarTop) fundBarTop.style.width = pct + '%';
  if (fundTextTop) fundTextTop.textContent = `$${STATE.revenue.toLocaleString()} / $${STATE.target.toLocaleString()}`;
  if (miniBar) miniBar.style.width = pct + '%';
  if (statRevenue) statRevenue.textContent = `$${STATE.revenue.toLocaleString()}`;
  if (statDay) statDay.textContent = STATE.day;
  if (statClients) statClients.textContent = STATE.clients;
  if (statEmails) statEmails.textContent = STATE.emailsSent;
  if (phaseBadge) phaseBadge.textContent = STATE.phase;

  // ── localStorage bridge ───────────────────────────────────────────────
  // Keeps app.html (the public website) in sync with the live stream overlay.
  try {
    localStorage.setItem('KRONOS_STATE', JSON.stringify({
      revenue:    STATE.revenue,
      target:     STATE.target,
      day:        STATE.day,
      phase:      STATE.phase,
      clients:    STATE.clients,
      emailsSent: STATE.emailsSent,
      responses:  STATE.responses,
      _ts:        Date.now(),
    }));

    // Episode log — sync after a micro-tick so _fireScript has time to push
    if (window.dramaEngine?.getEpisodeLog) {
      const log = window.dramaEngine.getEpisodeLog();
      if (log.length) {
        localStorage.setItem('KRONOS_EPISODES', JSON.stringify(log));
      }
    }
  } catch {
    // localStorage not available (OBS browser source in private mode, etc.)
  }
}

function showToast(message, accentColor = '#EF9F27') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.borderLeftColor = accentColor;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => toast.remove(), 4000);
}

function simulateViewerCount() {
  const el = document.getElementById('viewer-count');
  if (!el) return;
  let base = 247;
  setInterval(() => {
    base += Math.round(Math.sin(Date.now() / 8000) * 3 + (Math.random() - 0.5) * 2);
    base = Math.max(180, Math.min(420, base));
    el.textContent = base;
  }, 3000);
}

// Fetch live state from backend if available
async function syncState() {
  if (window.location.protocol === 'file:') return;

  try {
    const res = await fetch('/api/status', { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const data = await res.json();
      Object.assign(STATE, data);
      updateHUD();
    }
  } catch {
    // Backend not running — use mock state
  }
}

// Demo toasts for visual testing
function runDemoToasts() {
  const demos = [
    { msg: '📧 Zara envió 5 emails hoy', color: '#7F77DD' },
    { msg: '🔍 Rex encontró 8 leads calificados', color: '#3B6D11' },
    { msg: '📊 Pip generó reporte del día', color: '#F4C0D1' },
  ];
  let i = 0;
  setTimeout(() => {
    const interval = setInterval(() => {
      if (i >= demos.length) { clearInterval(interval); return; }
      showToast(demos[i].msg, demos[i].color);
      i++;
    }, 4500);
  }, 3000);
}

// Init
updateHUD();
simulateViewerCount();
syncState();
setInterval(syncState, 30000);
runDemoToasts();

// Expose globally
window.KRONOS_STATE = STATE;
window.showToast = showToast;
window.updateHUD = updateHUD;
