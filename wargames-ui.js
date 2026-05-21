/**
 * War Games UI Pro - inspirado en Caldera, SafeBreach, AttackIQ, RangeForce
 * - Dashboard ejecutivo con charts
 * - Kill chain visualization (gantt-style por phase)
 * - MITRE ATT&CK heatmap real
 * - Modal de detalle por agente (hover/click)
 * - Activity stream con filtros
 */
const WG_UI = (() => {
  const translations = {
    es: {
      wg_control: '⚔️ Control',
      wg_select_scenario: 'Selecciona Escenario',
      wg_scenario_owasp: 'Asedio Purple OWASP',
      wg_scenario_apt: 'Guantelete APT (Avanzado)',
      wg_btn_start: 'Iniciar',
      wg_btn_reset: 'Resetear',
      wg_attacker_score: 'Atacante',
      wg_defender_score: 'Defensor',
      wg_attackers: 'Atacantes',
      wg_defenders: 'Defensores',
      wg_status: 'Estado',
      wg_status_offline: 'Sin conexión',
      wg_status_active: 'Activo',
      wg_status_idle: 'Inactivo',
      wg_status_finished: 'Finalizado',
      wg_telemetry: '📡 Telemetría en vivo',
      wg_live: 'EN VIVO',
      wg_score_chart: '📊 Puntuación · evolución',
      wg_killchain: '🎯 Kill chain',
      wg_mitre_coverage: '🧬 MITRE ATT&CK',
      wg_error_start: 'Error iniciando escenario',
      wg_error_load: 'Error cargando estado',
      wg_confirm_reset: '¿Confirmar reinicio del juego de guerra?',
      wg_no_active_game: 'Inicia un juego para ver actividad',
      wg_no_attackers: 'Sin atacantes activos',
      wg_no_defenders: 'Sin defensores activos',
      wg_no_events: 'Sin eventos. Inicia un juego para generar telemetría.',
      wg_no_timeline: 'Sin actividad para este agente.',
      wg_toolkit: 'Toolkit',
      wg_mitre_techniques: 'Técnicas MITRE',
      wg_recent_activity: 'Actividad reciente',
      wg_runs: 'Runs',
      wg_events: 'Eventos',
      wg_success: 'Success',
    },
    en: {
      wg_control: '⚔️ Control',
      wg_select_scenario: 'Select Scenario',
      wg_scenario_owasp: 'Purple OWASP Siege',
      wg_scenario_apt: 'APT Gauntlet (Advanced)',
      wg_btn_start: 'Start',
      wg_btn_reset: 'Reset',
      wg_attacker_score: 'Attacker',
      wg_defender_score: 'Defender',
      wg_attackers: 'Attackers',
      wg_defenders: 'Defenders',
      wg_status: 'Status',
      wg_status_offline: 'Offline',
      wg_status_active: 'Active',
      wg_status_idle: 'Idle',
      wg_status_finished: 'Finished',
      wg_telemetry: '📡 Live Telemetry',
      wg_live: 'LIVE',
      wg_score_chart: '📊 Score · timeline',
      wg_killchain: '🎯 Kill chain',
      wg_mitre_coverage: '🧬 MITRE ATT&CK',
      wg_error_start: 'Error starting scenario',
      wg_error_load: 'Error loading state',
      wg_confirm_reset: 'Confirm war game reset?',
      wg_no_active_game: 'Start a game to see activity',
      wg_no_attackers: 'No active attackers',
      wg_no_defenders: 'No active defenders',
      wg_no_events: 'No events. Start a game to generate telemetry.',
      wg_no_timeline: 'No activity for this agent.',
      wg_toolkit: 'Toolkit',
      wg_mitre_techniques: 'MITRE Techniques',
      wg_recent_activity: 'Recent Activity',
      wg_runs: 'Runs',
      wg_events: 'Events',
      wg_success: 'Success',
    }
  };

  // ─── MITRE Tactics mapping (ATT&CK matrix) ───
  // Mapping de technique ID → tactic (kill chain phase)
  const MITRE_TACTICS = {
    'T1595': 'Reconnaissance', 'T1592': 'Reconnaissance', 'T1589': 'Reconnaissance', 'T1590': 'Reconnaissance', 'T1593': 'Reconnaissance', 'T1594': 'Reconnaissance', 'T1596': 'Reconnaissance', 'T1597': 'Reconnaissance', 'T1598': 'Reconnaissance',
    'T1583': 'Resource Development', 'T1584': 'Resource Development', 'T1587': 'Resource Development', 'T1588': 'Resource Development', 'T1608': 'Resource Development',
    'T1190': 'Initial Access', 'T1133': 'Initial Access', 'T1078': 'Initial Access', 'T1566': 'Initial Access', 'T1199': 'Initial Access', 'T1200': 'Initial Access', 'T1189': 'Initial Access', 'T1091': 'Initial Access', 'T1195': 'Initial Access',
    'T1059': 'Execution', 'T1203': 'Execution', 'T1204': 'Execution', 'T1106': 'Execution', 'T1129': 'Execution', 'T1569': 'Execution',
    'T1547': 'Persistence', 'T1136': 'Persistence', 'T1098': 'Persistence', 'T1546': 'Persistence', 'T1037': 'Persistence', 'T1543': 'Persistence', 'T1505': 'Persistence', 'T1053': 'Persistence',
    'T1068': 'Privilege Escalation', 'T1055': 'Privilege Escalation', 'T1548': 'Privilege Escalation', 'T1134': 'Privilege Escalation', 'T1484': 'Privilege Escalation',
    'T1027': 'Defense Evasion', 'T1140': 'Defense Evasion', 'T1070': 'Defense Evasion', 'T1218': 'Defense Evasion', 'T1036': 'Defense Evasion', 'T1112': 'Defense Evasion', 'T1497': 'Defense Evasion', 'T1562': 'Defense Evasion',
    'T1003': 'Credential Access', 'T1110': 'Credential Access', 'T1555': 'Credential Access', 'T1212': 'Credential Access', 'T1187': 'Credential Access', 'T1056': 'Credential Access', 'T1558': 'Credential Access',
    'T1018': 'Discovery', 'T1046': 'Discovery', 'T1082': 'Discovery', 'T1083': 'Discovery', 'T1135': 'Discovery', 'T1057': 'Discovery', 'T1087': 'Discovery', 'T1016': 'Discovery', 'T1033': 'Discovery', 'T1518': 'Discovery',
    'T1021': 'Lateral Movement', 'T1570': 'Lateral Movement', 'T1080': 'Lateral Movement', 'T1550': 'Lateral Movement', 'T1210': 'Lateral Movement',
    'T1005': 'Collection', 'T1560': 'Collection', 'T1119': 'Collection', 'T1213': 'Collection', 'T1056': 'Collection', 'T1115': 'Collection',
    'T1071': 'Command and Control', 'T1090': 'Command and Control', 'T1102': 'Command and Control', 'T1105': 'Command and Control', 'T1219': 'Command and Control', 'T1573': 'Command and Control',
    'T1041': 'Exfiltration', 'T1567': 'Exfiltration', 'T1029': 'Exfiltration', 'T1011': 'Exfiltration',
    'T1485': 'Impact', 'T1486': 'Impact', 'T1489': 'Impact', 'T1490': 'Impact', 'T1496': 'Impact', 'T1561': 'Impact',
  };

  function getTactic(techId) {
    if (!techId) return 'Other';
    const base = techId.split('.')[0]; // T1059.001 -> T1059
    return MITRE_TACTICS[base] || 'Other';
  }

  // Kill chain phase order
  const KC_ORDER = ['Reconnaissance', 'Resource Development', 'Initial Access', 'Execution', 'Persistence', 'Privilege Escalation', 'Defense Evasion', 'Credential Access', 'Discovery', 'Lateral Movement', 'Collection', 'Command and Control', 'Exfiltration', 'Impact'];

  // ─── State ───
  let currentLang = localStorage.getItem('cr-lang') || 'es';
  let autoRefreshInterval = null;
  let initialized = false;
  let lastState = null;
  let playbooksCache = null;
  let scoreHistory = []; // [{ts, atk, def}]
  let currentFilter = 'all';
  let scoreChart = null;
  let chartJsLoaded = false;

  function t(key) {
    return (translations[currentLang] || translations.en)[key] || key;
  }

  function translatePage() {
    // CRITICO: scope solo al contenedor war games (no pisar i18n global del portal)
    // Y solo aplica si el WG_UI tiene la traduccion (sino deja el texto fallback)
    const root = document.getElementById('wg-container');
    if (!root) return;
    root.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const dict = translations[currentLang] || translations.en;
      // Solo traducir si la key existe en NUESTRO diccionario
      if (dict && Object.prototype.hasOwnProperty.call(dict, key)) {
        el.textContent = dict[key];
      }
    });
  }

  function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text == null ? '' : text).replace(/[&<>"']/g, m => map[m]);
  }

  function formatTime(ts) {
    return new Date(ts || Date.now()).toLocaleTimeString(currentLang === 'es' ? 'es-ES' : 'en-US', { hour12: false });
  }

  function formatElapsed(startedAt) {
    if (!startedAt) return '';
    const elapsed = Math.max(0, (Date.now() - new Date(startedAt).getTime()) / 1000);
    const m = Math.floor(elapsed / 60);
    const s = Math.floor(elapsed % 60);
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  // ─── Chart.js loader (CDN, lazy) ───
  async function loadChartJs() {
    if (window.Chart) { chartJsLoaded = true; return; }
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
      s.onload = () => { chartJsLoaded = true; resolve(); };
      s.onerror = () => reject(new Error('Chart.js failed to load'));
      document.head.appendChild(s);
    });
  }

  async function loadPlaybooks() {
    if (playbooksCache) return playbooksCache;
    try {
      playbooksCache = await WARGAMES_API.getPlaybooks();
      return playbooksCache;
    } catch (e) {
      console.warn('[WG_UI] No se pudieron cargar playbooks:', e.message);
      return [];
    }
  }

  function showError(message) {
    const container = document.getElementById('wg-error-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'wg-error';
    el.textContent = message;
    container.innerHTML = '';
    container.appendChild(el);
    setTimeout(() => container.contains(el) && container.removeChild(el), 5000);
  }

  function updateConnectionStatus() {
    const ind = document.getElementById('wg-connection-status');
    if (!ind) return;
    const isOnline = WARGAMES_API.isOnline();
    const dot = ind.querySelector('.wg-status-dot');
    const lab = ind.querySelector('span:last-child');
    if (dot) dot.classList.toggle('active', isOnline);
    if (lab) lab.textContent = isOnline ? t('wg_status_active') : t('wg_status_offline');
  }

  // ─── Render principal ───
  async function loadState() {
    try {
      const state = await WARGAMES_API.getState();
      renderState(state);
      updateConnectionStatus();
    } catch (e) {
      console.error('[WG_UI] loadState', e);
      // No mostrar error en pantalla por timeouts pasajeros (polling es frecuente)
    }
  }

  function renderState(state) {
    if (!state) return;
    lastState = state;

    // Status banner
    const dot = document.getElementById('wg-status-dot');
    const txt = document.getElementById('wg-status-text');
    const elapsed = document.getElementById('wg-status-elapsed');
    const liveInd = document.getElementById('wg-live-indicator');

    if (dot && txt) {
      if (state.active) {
        dot.className = 'wg-status-dot active';
        txt.textContent = `${t('wg_status_active')} · ${state.scenario?.name || ''}`;
        if (liveInd) liveInd.style.display = 'inline-flex';
      } else if (state.endedAt) {
        dot.className = 'wg-status-dot finished';
        txt.textContent = t('wg_status_finished');
        if (liveInd) liveInd.style.display = 'none';
      } else {
        dot.className = 'wg-status-dot';
        txt.textContent = t('wg_status_idle');
        if (liveInd) liveInd.style.display = 'none';
      }
    }
    if (elapsed) elapsed.textContent = state.startedAt ? formatElapsed(state.startedAt) : '';

    // Scores
    const atkScoreEl = document.getElementById('wg-atk-score');
    const defScoreEl = document.getElementById('wg-def-score');
    const atkPrev = parseInt(atkScoreEl?.textContent || '0');
    const defPrev = parseInt(defScoreEl?.textContent || '0');
    const atkNow = state.score?.attacker ?? 0;
    const defNow = state.score?.defender ?? 0;
    if (atkScoreEl) atkScoreEl.textContent = atkNow;
    if (defScoreEl) defScoreEl.textContent = defNow;

    // Score history para chart
    if (state.active) {
      const lastEntry = scoreHistory[scoreHistory.length - 1];
      if (!lastEntry || lastEntry.atk !== atkNow || lastEntry.def !== defNow) {
        scoreHistory.push({ ts: Date.now(), atk: atkNow, def: defNow });
        if (scoreHistory.length > 60) scoreHistory.shift(); // últimas 60 muestras
      }
    }

    // Trend
    const atkTrend = document.getElementById('wg-atk-trend');
    const defTrend = document.getElementById('wg-def-trend');
    if (atkTrend) atkTrend.textContent = atkNow > atkPrev ? `↑ +${atkNow - atkPrev}` : (atkNow < atkPrev ? `↓ ${atkNow - atkPrev}` : '—');
    if (defTrend) defTrend.textContent = defNow > defPrev ? `↑ +${defNow - defPrev}` : (defNow < defPrev ? `↓ ${defNow - defPrev}` : '—');

    // Render agents (con stats por agente)
    renderAgents(state);

    // Charts + visualizaciones
    renderScoreChart();
    renderKillChain(state);
    renderMitreHeatmap(state);

    // Telemetry feed
    renderFeed(state);

    // Stats label
    const evTotal = document.getElementById('wg-events-total');
    if (evTotal) evTotal.textContent = `${(state.events || []).length} ${t('wg_events').toLowerCase()}`;
  }

  function getAgentStats(state, agentId) {
    const events = (state.events || []).filter(e => e.attacker === agentId || e.defender === agentId);
    const runs = new Set(events.map(e => e.runId).filter(Boolean));
    const attacks = events.filter(e => e.attacker === agentId && (e.type === 'attack-plan' || e.type === 'run-started')).length;
    const defenses = events.filter(e => e.defender === agentId && (e.type === 'defense-action' || e.type === 'defense')).length;
    const completed = events.filter(e => e.type === 'run-end' && (e.attacker === agentId || e.defender === agentId)).length;
    return { events: events.length, runs: runs.size, attacks, defenses, completed };
  }

  function renderAgents(state) {
    const renderAgent = (a, team) => {
      const stats = getAgentStats(state, a.id);
      const statusClass = (a.status || 'ready').toLowerCase().replace(/[^a-z]/g, '').slice(0, 15);
      const statusLabel = a.status || 'ready';
      return `<div class="wg-agent ${team}" onclick="WG_UI.openAgentModal('${escapeHtml(a.id)}')" data-agent-id="${escapeHtml(a.id)}" title="Click para ver detalle">
        <div class="wg-agent-row">
          <div style="min-width:0;flex:1">
            <div class="wg-agent-name">${escapeHtml(a.name)}</div>
            <div class="wg-agent-role">${escapeHtml(a.role)}</div>
          </div>
          <span class="wg-agent-status ${statusClass.startsWith('exec') ? 'executing' : statusClass.startsWith('monitor') ? 'monitoring' : 'ready'}">${escapeHtml(statusLabel.substring(0, 24))}</span>
        </div>
        <div class="wg-agent-meta">
          <span><b>${stats.events}</b> eventos</span>
          <span><b>${stats.runs}</b> ${t('wg_runs').toLowerCase()}</span>
          ${team === 'atk' ? `<span><b>${stats.attacks}</b> ataques</span>` : `<span><b>${stats.defenses}</b> defensas</span>`}
        </div>
      </div>`;
    };

    const attackers = state.agents?.attackers || [];
    const defenders = state.agents?.defenders || [];

    const atkContainer = document.getElementById('wg-attackers');
    const defContainer = document.getElementById('wg-defenders');
    const atkCount = document.getElementById('wg-atk-count');
    const defCount = document.getElementById('wg-def-count');

    if (atkCount) atkCount.textContent = attackers.length;
    if (defCount) defCount.textContent = defenders.length;

    if (atkContainer) {
      atkContainer.innerHTML = attackers.length === 0
        ? `<div class="wg-welcome" style="padding:14px 8px"><div class="wg-welcome-hint">${t('wg_no_attackers')}</div></div>`
        : attackers.map(a => renderAgent(a, 'atk')).join('');
    }
    if (defContainer) {
      defContainer.innerHTML = defenders.length === 0
        ? `<div class="wg-welcome" style="padding:14px 8px"><div class="wg-welcome-hint">${t('wg_no_defenders')}</div></div>`
        : defenders.map(a => renderAgent(a, 'def')).join('');
    }
  }

  // ─── Score chart ───
  async function renderScoreChart() {
    if (!chartJsLoaded) await loadChartJs().catch(() => null);
    if (!window.Chart) return;
    const canvas = document.getElementById('wg-score-chart');
    if (!canvas) return;

    const labels = scoreHistory.map(p => formatTime(p.ts));
    const atkData = scoreHistory.map(p => p.atk);
    const defData = scoreHistory.map(p => p.def);

    if (scoreChart) {
      scoreChart.data.labels = labels;
      scoreChart.data.datasets[0].data = atkData;
      scoreChart.data.datasets[1].data = defData;
      scoreChart.update('none');
      return;
    }

    scoreChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Atacante',
            data: atkData,
            borderColor: '#ff5c57',
            backgroundColor: 'rgba(255,92,87,0.1)',
            fill: true, tension: 0.3, borderWidth: 2, pointRadius: 0, pointHoverRadius: 4,
          },
          {
            label: 'Defensor',
            data: defData,
            borderColor: '#6bb7ff',
            backgroundColor: 'rgba(107,183,255,0.1)',
            fill: true, tension: 0.3, borderWidth: 2, pointRadius: 0, pointHoverRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top', labels: { color: '#91a0b8', font: { size: 10 }, boxWidth: 12 } },
          tooltip: { backgroundColor: '#0d1420', titleColor: '#fff', bodyColor: '#edf3ff', borderColor: '#263449', borderWidth: 1 },
        },
        scales: {
          x: { ticks: { color: '#91a0b8', font: { size: 9 }, maxTicksLimit: 8 }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { ticks: { color: '#91a0b8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true },
        },
        animation: { duration: 200 },
      },
    });
  }

  // ─── Kill chain visualization ───
  async function renderKillChain(state) {
    const container = document.getElementById('wg-killchain');
    if (!container) return;

    const events = state.events || [];
    if (events.length === 0 || !state.active) {
      container.innerHTML = `<div class="wg-welcome"><div class="wg-welcome-icon">🎯</div><div class="wg-welcome-hint">${t('wg_no_active_game')}</div></div>`;
      return;
    }

    await loadPlaybooks();

    // Calcular eventos por phase
    const phaseCount = {};
    const phaseRuns = {};

    events.forEach(ev => {
      if (ev.playbookId) {
        const pb = (playbooksCache || []).find(p => p.id === ev.playbookId);
        const techs = pb?.mitre || [];
        techs.forEach(tech => {
          const phase = getTactic(tech);
          phaseCount[phase] = (phaseCount[phase] || 0) + 1;
          if (!phaseRuns[phase]) phaseRuns[phase] = new Set();
          if (ev.runId) phaseRuns[phase].add(ev.runId);
        });
      }
    });

    const maxCount = Math.max(...Object.values(phaseCount), 1);
    const phases = KC_ORDER.filter(p => phaseCount[p] > 0);

    if (phases.length === 0) {
      container.innerHTML = `<div class="wg-welcome"><div class="wg-welcome-icon">🎯</div><div class="wg-welcome-hint">Esperando primer ataque...</div></div>`;
      return;
    }

    container.innerHTML = phases.map(phase => {
      const count = phaseCount[phase] || 0;
      const runs = (phaseRuns[phase] || new Set()).size;
      const pct = (count / maxCount) * 100;
      return `<div class="wg-kc-row">
        <div class="wg-kc-phase">${escapeHtml(phase)}</div>
        <div class="wg-kc-bar">
          <div class="wg-kc-bar-fill" style="width:${pct}%">${runs} ${runs === 1 ? 'run' : 'runs'}</div>
        </div>
        <div class="wg-kc-count">${count}</div>
      </div>`;
    }).join('');
  }

  // ─── MITRE heatmap ───
  async function renderMitreHeatmap(state) {
    const container = document.getElementById('wg-mitre');
    const totalEl = document.getElementById('wg-mitre-total');
    if (!container) return;

    const events = state.events || [];
    if (events.length === 0 || !state.active) {
      container.innerHTML = `<div class="wg-welcome"><div class="wg-welcome-icon">🧬</div><div class="wg-welcome-hint">${t('wg_no_active_game')}</div></div>`;
      if (totalEl) totalEl.textContent = '0 técnicas';
      return;
    }

    await loadPlaybooks();

    // Contar técnicas únicas y veces ejecutadas
    const techCount = {};
    events.forEach(ev => {
      if (ev.playbookId) {
        const pb = (playbooksCache || []).find(p => p.id === ev.playbookId);
        (pb?.mitre || []).forEach(tech => {
          techCount[tech] = (techCount[tech] || 0) + 1;
        });
      }
    });

    const techs = Object.entries(techCount).sort((a, b) => b[1] - a[1]);
    if (totalEl) totalEl.textContent = `${techs.length} técnicas`;

    if (techs.length === 0) {
      container.innerHTML = `<div class="wg-welcome"><div class="wg-welcome-icon">🧬</div><div class="wg-welcome-hint">Esperando ejecución de playbooks...</div></div>`;
      return;
    }

    const maxCount = Math.max(...techs.map(t => t[1]));

    container.innerHTML = `<div class="wg-mitre-grid">${techs.map(([tech, count]) => {
      const intensity = Math.min(3, Math.ceil((count / maxCount) * 3));
      const tactic = getTactic(tech);
      return `<div class="wg-mitre-cell exec-${intensity}" title="${escapeHtml(tactic)} · ${count} ejecuciones">
        <span class="tech">${escapeHtml(tech)}</span>
        <span class="count">×${count}</span>
      </div>`;
    }).join('')}</div>`;
  }

  // ─── Telemetry feed ───
  function eventMatchesFilter(ev) {
    if (currentFilter === 'all') return true;
    if (currentFilter === 'attack') return ev.type?.includes('attack') || ev.attacker;
    if (currentFilter === 'defense') return ev.type?.includes('defense') || ev.defender;
    if (currentFilter === 'step') return ev.type?.startsWith('step') || ev.type?.startsWith('run');
    return true;
  }

  function renderFeed(state) {
    const feed = document.getElementById('wg-feed');
    if (!feed) return;

    const events = (state.events || []).filter(eventMatchesFilter);

    if (events.length === 0) {
      feed.innerHTML = `<div class="wg-welcome" style="padding:30px 16px"><div class="wg-welcome-icon">📡</div><div class="wg-welcome-hint">${t('wg_no_events')}</div></div>`;
      return;
    }

    // Más recientes arriba
    feed.innerHTML = events.slice().reverse().map(ev => {
      const time = formatTime(ev.ts);
      const typeClean = (ev.type || 'event').toLowerCase().replace(/[^a-z-]/g, '');
      const msg = (typeof ev.message === 'string' ? ev.message : JSON.stringify(ev.message || '')).normalize('NFC');
      return `<div class="wg-event">
        <div class="wg-event-time">${time}</div>
        <div class="wg-event-body">
          <span class="wg-event-type ${typeClean}">${escapeHtml(ev.type || 'event')}</span>
          <div class="wg-event-msg">${escapeHtml(msg)}</div>
        </div>
      </div>`;
    }).join('');
  }

  // ─── Agent detail modal ───
  function openAgentModal(agentId) {
    if (!lastState) return;
    const all = [...(lastState.agents?.attackers || []), ...(lastState.agents?.defenders || [])];
    const agent = all.find(a => a.id === agentId);
    if (!agent) return;

    const isAttacker = agent.id.startsWith('atk');
    const team = isAttacker ? 'atk' : 'def';
    const teamLabel = isAttacker ? t('wg_attackers') : t('wg_defenders');
    const initial = (agent.name || '?')[0].toUpperCase();

    // Header
    const avatar = document.getElementById('wg-modal-avatar');
    const nameEl = document.getElementById('wg-modal-name');
    const roleEl = document.getElementById('wg-modal-role');
    const teamEl = document.getElementById('wg-modal-team');
    if (avatar) { avatar.className = `wg-modal-avatar ${team}`; avatar.textContent = initial; }
    if (nameEl) nameEl.textContent = agent.name;
    if (roleEl) roleEl.textContent = agent.role || '—';
    if (teamEl) { teamEl.className = `wg-modal-team ${team}`; teamEl.textContent = teamLabel.toUpperCase(); }

    // Stats
    const stats = getAgentStats(lastState, agent.id);

    // Eventos del agente
    const agentEvents = (lastState.events || []).filter(e => e.attacker === agent.id || e.defender === agent.id);

    // MITRE techniques de este agente (vía playbooks ejecutados)
    const agentTechs = new Set();
    const agentPlaybooks = new Set();
    agentEvents.forEach(ev => {
      if (ev.playbookId) {
        agentPlaybooks.add(ev.playbookId);
        const pb = (playbooksCache || []).find(p => p.id === ev.playbookId);
        (pb?.mitre || []).forEach(tech => agentTechs.add(tech));
      }
    });

    const body = document.getElementById('wg-modal-body');
    if (!body) return;

    body.innerHTML = `
      <div class="wg-modal-section">
        <div class="wg-modal-section-title">📊 Estadísticas</div>
        <div class="wg-modal-stats">
          <div class="wg-modal-stat">
            <div class="wg-modal-stat-val">${stats.events}</div>
            <div class="wg-modal-stat-label">${t('wg_events')}</div>
          </div>
          <div class="wg-modal-stat">
            <div class="wg-modal-stat-val">${stats.runs}</div>
            <div class="wg-modal-stat-label">${t('wg_runs')}</div>
          </div>
          <div class="wg-modal-stat">
            <div class="wg-modal-stat-val">${stats.completed}</div>
            <div class="wg-modal-stat-label">Completed</div>
          </div>
        </div>
        <div style="font-size:10.5px;color:var(--muted);margin-top:10px">Status: <b style="color:var(--fg)">${escapeHtml(agent.status || 'ready')}</b></div>
        <div style="font-size:10.5px;color:var(--muted);margin-top:4px">ID: <code style="color:var(--fg)">${escapeHtml(agent.id)}</code></div>
      </div>

      <div class="wg-modal-section">
        <div class="wg-modal-section-title">🛠️ ${t('wg_toolkit')}</div>
        <div class="wg-modal-chips">
          ${(agent.toolkit || []).map(tool => `<span class="wg-modal-chip">${escapeHtml(tool)}</span>`).join('') || '<span class="wg-modal-no-data">Sin toolkit</span>'}
        </div>
      </div>

      <div class="wg-modal-section full">
        <div class="wg-modal-section-title">🧬 ${t('wg_mitre_techniques')} · ${agentTechs.size} técnicas · ${agentPlaybooks.size} playbooks</div>
        <div class="wg-modal-chips">
          ${[...agentTechs].map(tech => `<span class="wg-modal-chip mitre" title="${escapeHtml(getTactic(tech))}">${escapeHtml(tech)}</span>`).join('') || '<span class="wg-modal-no-data">Sin técnicas ejecutadas aún</span>'}
        </div>
      </div>

      <div class="wg-modal-section full">
        <div class="wg-modal-section-title">📜 ${t('wg_recent_activity')} · ${agentEvents.length} eventos</div>
        <div class="wg-modal-timeline">
          ${agentEvents.length === 0
            ? `<div class="wg-modal-no-data">${t('wg_no_timeline')}</div>`
            : agentEvents.slice().reverse().slice(0, 50).map(ev => `
              <div class="wg-modal-event ${isAttacker ? 'atk' : 'def'}">
                <div class="wg-modal-event-time">${formatTime(ev.ts)} · <b>${escapeHtml(ev.type || 'event')}</b>${ev.playbookId ? ' · ' + escapeHtml(ev.playbookId) : ''}</div>
                <div class="wg-modal-event-msg">${escapeHtml((ev.message || '').normalize('NFC'))}</div>
              </div>`).join('')
          }
        </div>
      </div>
    `;

    const backdrop = document.getElementById('wg-agent-modal');
    if (backdrop) backdrop.classList.add('visible');
  }

  function closeAgentModal() {
    const backdrop = document.getElementById('wg-agent-modal');
    if (backdrop) backdrop.classList.remove('visible');
  }

  // Escape para cerrar modal
  if (typeof window !== 'undefined') {
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeAgentModal();
    });
  }

  // ─── Public API ───
  return {
    async init() {
      if (initialized) return;
      const container = document.getElementById('wg-container');
      if (!container) return;
      container.style.display = 'grid';

      translatePage();

      // Pre-cargar chart.js en background
      loadChartJs().catch(() => null);
      loadPlaybooks().catch(() => null);

      await loadState();

      // Polling 2s
      if (autoRefreshInterval) clearInterval(autoRefreshInterval);
      autoRefreshInterval = setInterval(loadState, 2000);

      // Tick para elapsed time
      setInterval(() => {
        const el = document.getElementById('wg-status-elapsed');
        if (el && lastState?.startedAt && lastState.active) {
          el.textContent = formatElapsed(lastState.startedAt);
        }
      }, 1000);

      initialized = true;
      console.log('[WG_UI] Pro UI initialized');
    },

    async startScenario() {
      const scenario = document.getElementById('wg-scenario-select')?.value || 'purple-owasp';
      const btn = document.getElementById('wg-start-btn');
      try {
        if (btn) btn.disabled = true;
        scoreHistory = []; // reset chart
        if (scoreChart) { scoreChart.destroy(); scoreChart = null; }
        const state = await WARGAMES_API.startScenario(scenario);
        renderState(state);
        updateConnectionStatus();
      } catch (e) {
        console.error('[WG_UI] start', e);
        showError(`${t('wg_error_start')}: ${WARGAMES_API.translateError(e)}`);
      } finally {
        if (btn) btn.disabled = false;
      }
    },

    async resetScenario() {
      if (!confirm(t('wg_confirm_reset'))) return;
      const btn = document.getElementById('wg-reset-btn');
      try {
        if (btn) btn.disabled = true;
        const state = await WARGAMES_API.resetScenario();
        scoreHistory = [];
        if (scoreChart) { scoreChart.destroy(); scoreChart = null; }
        renderState(state);
        updateConnectionStatus();
      } catch (e) {
        console.error('[WG_UI] reset', e);
        showError(`Error: ${WARGAMES_API.translateError(e)}`);
      } finally {
        if (btn) btn.disabled = false;
      }
    },

    setFilter(filter) {
      currentFilter = filter;
      document.querySelectorAll('.wg-filter').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-filter') === filter);
      });
      if (lastState) renderFeed(lastState);
    },

    openAgentModal,
    closeAgentModal,

    setLanguage(lang) {
      currentLang = lang;
      localStorage.setItem('cr-lang', lang);
      WARGAMES_API.setLanguage(lang);
      translatePage();
      if (lastState) renderState(lastState);
    },

    cleanup() {
      if (autoRefreshInterval) clearInterval(autoRefreshInterval);
      if (scoreChart) { scoreChart.destroy(); scoreChart = null; }
      initialized = false;
    },

    _state: () => ({ initialized, currentLang, lastState, scoreHistoryLen: scoreHistory.length }),
  };
})();

// Auto-init
if (typeof window !== 'undefined') {
  window.WG_UI = WG_UI;
  if (document.getElementById('wg-container')) {
    WG_UI.init();
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (document.getElementById('wg-container')) WG_UI.init();
    });
  }
}
