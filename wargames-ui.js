/**
 * War Games UI module - separado del HTML para que se pueda cargar via <script src>
 * (los <script> dentro de innerHTML NO se ejecutan automáticamente)
 */
const WG_UI = (() => {
  const translations = {
    es: {
      wg_select_scenario: 'Selecciona Escenario',
      wg_scenario_owasp: 'Asedio Purple OWASP',
      wg_scenario_apt: 'Guantelete APT (Avanzado)',
      wg_btn_start: 'Iniciar',
      wg_btn_reset: 'Resetear',
      wg_attacker_score: 'Puntuación Atacante',
      wg_defender_score: 'Puntuación Defensor',
      wg_status: 'Estado',
      wg_attackers: 'Atacantes',
      wg_defenders: 'Defensores',
      wg_telemetry: 'Telemetría en Tiempo Real',
      wg_live: 'EN VIVO',
      wg_loading: 'Cargando...',
      wg_status_offline: 'Sin conexión',
      wg_status_active: 'Activo',
      wg_status_idle: 'Inactivo',
      wg_error_start: 'Error iniciando escenario',
      wg_error_load: 'Error cargando estado del juego',
      wg_success_reset: 'Juego de guerra reiniciado',
      wg_confirm_reset: '¿Confirmar reinicio del juego de guerra?',
      wg_no_active_game: 'Sin juego activo. Selecciona escenario y presiona Iniciar para comenzar.',
      wg_no_attackers: 'Inicia un juego para ver atacantes.',
      wg_no_defenders: 'Inicia un juego para ver defensores.',
    },
    en: {
      wg_select_scenario: 'Select Scenario',
      wg_scenario_owasp: 'Purple OWASP Siege',
      wg_scenario_apt: 'APT Gauntlet (Advanced)',
      wg_btn_start: 'Start',
      wg_btn_reset: 'Reset',
      wg_attacker_score: 'Attacker Score',
      wg_defender_score: 'Defender Score',
      wg_status: 'Status',
      wg_attackers: 'Attackers',
      wg_defenders: 'Defenders',
      wg_telemetry: 'Real-time Telemetry',
      wg_live: 'LIVE',
      wg_loading: 'Loading...',
      wg_status_offline: 'Offline',
      wg_status_active: 'Active',
      wg_status_idle: 'Idle',
      wg_error_start: 'Error starting scenario',
      wg_error_load: 'Error loading game state',
      wg_success_reset: 'War game reset',
      wg_confirm_reset: 'Confirm war game reset?',
      wg_no_active_game: 'No active game. Select scenario and press Start to begin.',
      wg_no_attackers: 'Start a game to see attackers.',
      wg_no_defenders: 'Start a game to see defenders.',
    }
  };

  let currentLang = localStorage.getItem('cr-lang') || 'es';
  let autoRefreshInterval = null;
  let initialized = false;

  function t(key) {
    return (translations[currentLang] || translations.en)[key] || key;
  }

  function translatePage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    });
  }

  function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text).replace(/[&<>"']/g, m => map[m]);
  }

  function showError(message) {
    const container = document.getElementById('wg-error-container');
    if (!container) return;

    const errorDiv = document.createElement('div');
    errorDiv.className = 'wg-error';
    errorDiv.textContent = message;

    container.innerHTML = '';
    container.appendChild(errorDiv);

    setTimeout(() => {
      if (container.contains(errorDiv)) {
        errorDiv.style.opacity = '0';
        errorDiv.style.transition = 'opacity 0.3s';
        setTimeout(() => container.contains(errorDiv) && container.removeChild(errorDiv), 300);
      }
    }, 5000);
  }

  function updateConnectionStatus() {
    const indicator = document.getElementById('wg-connection-status');
    if (!indicator) return;

    const isOnline = WARGAMES_API.isOnline();
    indicator.classList.toggle('active', isOnline);
    const label = indicator.querySelector('span:last-child');
    if (label) {
      label.textContent = isOnline ? t('wg_status_active') : t('wg_status_offline');
    }
  }

  async function loadState() {
    try {
      const state = await WARGAMES_API.getState();
      renderState(state);
      updateConnectionStatus();
    } catch (error) {
      console.error('[WG_UI] Load state error:', error);
      showError(`${t('wg_error_load')}: ${WARGAMES_API.translateError(error)}`);
    }
  }

  function renderState(state) {
    if (!state) return;

    // Stats
    const atk = document.getElementById('wg-atk-score');
    const def = document.getElementById('wg-def-score');
    if (atk) atk.textContent = state.score?.attacker ?? 0;
    if (def) def.textContent = state.score?.defender ?? 0;

    // Status
    const statusEl = document.getElementById('wg-status');
    const liveEl = document.getElementById('wg-live');
    if (statusEl) {
      if (state.active) {
        statusEl.textContent = `${t('wg_status_active')} · ${state.scenario?.name || ''}`;
        if (liveEl) liveEl.style.display = 'inline-block';
      } else {
        statusEl.textContent = state.endedAt ? 'finalizado' : t('wg_status_idle').toLowerCase();
        if (liveEl) liveEl.style.display = 'none';
      }
    }

    // Agents
    const renderAgent = (agent, isAttacker) => {
      const div = document.createElement('div');
      div.className = 'wg-agent-card';
      div.innerHTML = `
        <div class="wg-agent-info">
          <div class="wg-agent-name">${escapeHtml(agent.name)}</div>
          <div class="wg-agent-role">${escapeHtml(agent.role)}</div>
        </div>
        <div class="wg-agent-badge" style="color: ${isAttacker ? 'var(--red)' : 'var(--blue)'};">
          ${escapeHtml(agent.status || 'ready')}
        </div>
      `;
      return div;
    };

    const atkContainer = document.getElementById('wg-attackers');
    const defContainer = document.getElementById('wg-defenders');

    const attackers = state.agents?.attackers || [];
    if (atkContainer) {
      atkContainer.innerHTML = '';
      if (attackers.length === 0) {
        atkContainer.innerHTML = `<div style="color: var(--muted); font-size: 11px; padding: 8px;">${t('wg_no_attackers')}</div>`;
      } else {
        attackers.forEach(a => atkContainer.appendChild(renderAgent(a, true)));
      }
    }

    const defenders = state.agents?.defenders || [];
    if (defContainer) {
      defContainer.innerHTML = '';
      if (defenders.length === 0) {
        defContainer.innerHTML = `<div style="color: var(--muted); font-size: 11px; padding: 8px;">${t('wg_no_defenders')}</div>`;
      } else {
        defenders.forEach(a => defContainer.appendChild(renderAgent(a, false)));
      }
    }

    // Events feed
    const feed = document.getElementById('wg-feed');
    if (feed) {
      const events = state.events || [];
      if (events.length === 0) {
        feed.innerHTML = `<div style="color: var(--muted); font-size: 11px; padding: 8px;">${state.active ? t('wg_loading') : t('wg_no_active_game')}</div>`;
      } else {
        feed.innerHTML = events.slice().reverse().map(ev => {
          const cls = ev.type?.includes('attack') ? 'attack' : ev.type?.includes('defense') ? 'defense' : 'info';
          const time = new Date(ev.ts || Date.now()).toLocaleTimeString(
            currentLang === 'es' ? 'es-ES' : 'en-US',
            { hour12: false }
          );
          return `<div class="wg-event ${cls}">
            <div class="wg-event-time">${time}</div>
            <div><span class="wg-event-type">${escapeHtml(ev.type || 'event')}</span> <span class="wg-event-msg">${escapeHtml(ev.message || '')}</span></div>
          </div>`;
        }).join('');
      }
    }
  }

  return {
    async init() {
      if (initialized) {
        console.log('[WG_UI] Already initialized, skipping');
        return;
      }

      const container = document.getElementById('wg-container');
      if (!container) {
        console.warn('[WG_UI] wg-container not found in DOM');
        return;
      }

      container.style.display = 'grid';

      // Aplicar traducciones
      translatePage();

      // Cargar estado inicial
      await loadState();

      // Auto-refresh cada 2s
      if (autoRefreshInterval) clearInterval(autoRefreshInterval);
      autoRefreshInterval = setInterval(loadState, 2000);

      initialized = true;
      console.log('[WG_UI] Initialized successfully');
    },

    async startScenario() {
      const scenario = document.getElementById('wg-scenario-select')?.value || 'purple-owasp';
      const startBtn = document.getElementById('wg-start-btn');

      try {
        if (startBtn) startBtn.disabled = true;
        const state = await WARGAMES_API.startScenario(scenario);
        renderState(state);
        updateConnectionStatus();
      } catch (error) {
        console.error('[WG_UI] Start error:', error);
        showError(`${t('wg_error_start')}: ${WARGAMES_API.translateError(error)}`);
      } finally {
        if (startBtn) startBtn.disabled = false;
      }
    },

    async resetScenario() {
      if (!confirm(t('wg_confirm_reset'))) return;

      const resetBtn = document.getElementById('wg-reset-btn');
      try {
        if (resetBtn) resetBtn.disabled = true;
        const state = await WARGAMES_API.resetScenario();
        renderState(state);
        updateConnectionStatus();
      } catch (error) {
        console.error('[WG_UI] Reset error:', error);
        showError(`Error: ${WARGAMES_API.translateError(error)}`);
      } finally {
        if (resetBtn) resetBtn.disabled = false;
      }
    },

    setLanguage(lang) {
      currentLang = lang;
      localStorage.setItem('cr-lang', lang);
      WARGAMES_API.setLanguage(lang);
      translatePage();
      loadState();
    },

    cleanup() {
      if (autoRefreshInterval) clearInterval(autoRefreshInterval);
      initialized = false;
    },

    // For debugging
    _state: () => ({ initialized, currentLang, autoRefreshInterval })
  };
})();

// Auto-init si el DOM ya tiene wg-container
if (typeof window !== 'undefined') {
  window.WG_UI = WG_UI;
  // Try to init now or wait for DOM ready
  if (document.getElementById('wg-container')) {
    WG_UI.init();
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (document.getElementById('wg-container')) WG_UI.init();
    });
  }
}
