/**
 * War Games API Proxy Layer
 *
 * Enables War Games to work in three scenarios:
 * 1. Local: http://localhost:8090 → direct /runner/ proxy via nginx
 * 2. Vercel + Tunnel: tunnel.vercel.app → routes back through Cloudflare → localhost:8090
 * 3. Offline: IndexedDB fallback (demo mode)
 *
 * This module handles:
 * - Endpoint routing (local vs remote)
 * - Retry logic with fallback
 * - Tunnel detection and configuration
 * - Error handling with descriptive messages
 * - Translations (EN/ES)
 */

const WARGAMES_API = (() => {
  // Configuration
  const CONFIG = {
    LOCAL_BASE: 'http://localhost:8090',
    RUNNER_ENDPOINT: '/runner/api',
    TIMEOUT_MS: 8000,
    RETRY_ATTEMPTS: 2,
    RETRY_DELAY_MS: 500,
    // Public Gist URL — watchdog actualiza esto con la URL actual del tunnel
    // Permite que el portal Vercel auto-detecte el tunnel sin intervención manual
    TUNNEL_REGISTRY_URL: 'https://gist.githubusercontent.com/rafaelcastro7/4ec6171f3bb46b3e4c82ab3045768687/raw/tunnel-url.txt',
    TUNNEL_CACHE_KEY: 'cr-tunnel-cache',
    TUNNEL_CACHE_TTL_MS: 60000, // 1 minute
  };

  // Translations for error messages only (NOT for API endpoints)
  const I18N = {
    es: {
      ERROR_NETWORK: 'Error de conexión. Verifica que el servidor esté disponible.',
      ERROR_JSON: 'Respuesta inválida del servidor (JSON corrupto).',
      ERROR_TUNNEL_DOWN: 'El túnel Cloudflare no está disponible. Intenta reconectar.',
      ERROR_TIMEOUT: 'Tiempo de espera agotado (>8s). El servidor está lento.',
      ERROR_404: 'Endpoint no encontrado (404). Verifica la URL.',
      ERROR_SCENARIO_NOT_FOUND: 'El escenario no existe.',
      STATUS_CONNECTING: 'Conectando...',
      STATUS_OFFLINE_MODE: 'Modo sin conexión (demostración)',
    },
    en: {
      ERROR_NETWORK: 'Connection error. Check that the server is available.',
      ERROR_JSON: 'Invalid server response (corrupted JSON).',
      ERROR_TUNNEL_DOWN: 'Cloudflare tunnel is unavailable. Try reconnecting.',
      ERROR_TIMEOUT: 'Timeout exceeded (>8s). Server is slow.',
      ERROR_404: 'Endpoint not found (404). Check the URL.',
      ERROR_SCENARIO_NOT_FOUND: 'Scenario does not exist.',
      STATUS_CONNECTING: 'Connecting...',
      STATUS_OFFLINE_MODE: 'Offline mode (demo)',
    }
  };

  // API endpoints (NOT translated - use correct paths)
  const ENDPOINTS = {
    PLAYBOOKS: '/playbooks',
    STATE: '/wargames/state',
    START: '/wargames/start',
    RESET: '/wargames/reset',
    HISTORY: '/history',
    CAPABILITIES: '/validation/capabilities',
  };

  // State
  let lang = localStorage.getItem('cr-lang') || 'es';
  let offlineMode = false;
  let lastKnownState = null;
  let isConnected = false;

  /**
   * Get translated message
   */
  function t(key) {
    return (I18N[lang] || I18N.en)[key] || key;
  }

  /**
   * Fetch tunnel URL from public Gist (auto-discovery)
   * El watchdog actualiza el gist; el portal lo lee → persistencia automática
   */
  async function fetchTunnelFromRegistry() {
    // Check cache first
    try {
      const cached = JSON.parse(localStorage.getItem(CONFIG.TUNNEL_CACHE_KEY) || 'null');
      if (cached && (Date.now() - cached.ts < CONFIG.TUNNEL_CACHE_TTL_MS)) {
        return cached.url;
      }
    } catch (e) { /* ignore cache error */ }

    try {
      const resp = await fetch(CONFIG.TUNNEL_REGISTRY_URL, { cache: 'no-cache' });
      if (!resp.ok) throw new Error('Registry unreachable');
      const url = (await resp.text()).trim();
      if (url && url.startsWith('http')) {
        localStorage.setItem(CONFIG.TUNNEL_CACHE_KEY, JSON.stringify({ url, ts: Date.now() }));
        return url;
      }
    } catch (e) {
      console.warn('[War Games] Could not fetch tunnel from registry:', e.message);
    }
    return null;
  }

  /**
   * Detect environment: local vs remote (Vercel)
   */
  function detectEnvironment() {
    const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    const isVercel = location.hostname.includes('vercel.app');
    // Prioridad: 1) localStorage manual, 2) auto-detectado desde gist (async)
    const tunnel = localStorage.getItem('cr-primary-tunnel') || '';

    return {
      isLocal,
      isVercel,
      tunnel,
      baseURL: isLocal ? CONFIG.LOCAL_BASE : (tunnel || '')
    };
  }

  /**
   * Initialize tunnel auto-discovery (async background)
   * Si está en Vercel sin tunnel configurado, busca uno en el gist registry
   */
  async function initTunnelDiscovery() {
    const env = detectEnvironment();
    if (env.isVercel && !env.tunnel) {
      const discovered = await fetchTunnelFromRegistry();
      if (discovered) {
        localStorage.setItem('cr-primary-tunnel', discovered);
        console.log('[War Games] Tunnel auto-discovered:', discovered);
        // Reload para aplicar
        if (window.WG_UI && window.WG_UI.init) {
          window.WG_UI.init();
        }
      }
    }
  }

  // Auto-run on module load
  if (typeof window !== 'undefined') {
    setTimeout(initTunnelDiscovery, 100);
  }

  /**
   * Main fetch wrapper with retry + fallback
   */
  async function fetchWithRetry(endpoint, options = {}) {
    const env = detectEnvironment();
    const baseURL = env.baseURL;

    if (!baseURL && env.isVercel) {
      throw new Error(`${t('ERROR_TUNNEL_DOWN')} (No tunnel configured)`);
    }

    const fullURL = `${baseURL}${CONFIG.RUNNER_ENDPOINT}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS);

    let lastError = null;

    for (let attempt = 0; attempt < CONFIG.RETRY_ATTEMPTS; attempt++) {
      try {
        const response = await fetch(fullURL, {
          ...options,
          signal: controller.signal,
          cache: options.cache || 'no-cache',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-By': 'CyberRange-WarGames',
            ...options.headers
          }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(`${t('ERROR_404')}: ${endpoint}`);
          }
          if (response.status === 500) {
            throw new Error('Server error (500). Try again later.');
          }
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        isConnected = true;
        offlineMode = false;
        return data;

      } catch (error) {
        lastError = error;

        if (attempt < CONFIG.RETRY_ATTEMPTS - 1) {
          await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY_MS));
        }
      }
    }

    clearTimeout(timeoutId);
    isConnected = false;

    // Handle different error types
    if (lastError instanceof SyntaxError) {
      throw new Error(t('ERROR_JSON'));
    }
    if (lastError instanceof TypeError) {
      throw new Error(t('ERROR_NETWORK'));
    }
    if (lastError.name === 'AbortError') {
      throw new Error(t('ERROR_TIMEOUT'));
    }

    throw lastError;
  }

  /**
   * Public API methods
   */
  return {
    setLanguage(newLang) {
      lang = newLang;
      localStorage.setItem('cr-lang', newLang);
    },

    isOnline() {
      return isConnected && !offlineMode;
    },

    getEnvironment() {
      return detectEnvironment();
    },

    async getPlaybooks() {
      try {
        return await fetchWithRetry(ENDPOINTS.PLAYBOOKS);
      } catch (error) {
        console.error('[War Games] Playbooks fetch failed:', error);
        throw error;
      }
    },

    async getState() {
      try {
        const state = await fetchWithRetry(ENDPOINTS.STATE);
        lastKnownState = state;
        return state;
      } catch (error) {
        console.error('[War Games] State fetch failed:', error);
        if (lastKnownState) {
          console.warn('[War Games] Using cached state');
          return lastKnownState;
        }
        throw error;
      }
    },

    async startScenario(scenario = 'purple-owasp') {
      try {
        return await fetchWithRetry(ENDPOINTS.START, {
          method: 'POST',
          body: JSON.stringify({ scenario })
        });
      } catch (error) {
        console.error('[War Games] Start scenario failed:', error);
        throw error;
      }
    },

    async resetScenario() {
      try {
        return await fetchWithRetry(ENDPOINTS.RESET, {
          method: 'POST',
          body: JSON.stringify({})
        });
      } catch (error) {
        console.error('[War Games] Reset scenario failed:', error);
        throw error;
      }
    },

    async getHistory(runId) {
      try {
        return await fetchWithRetry(`${ENDPOINTS.HISTORY}/${runId}`);
      } catch (error) {
        console.error('[War Games] History fetch failed:', error);
        throw error;
      }
    },

    async getCapabilities() {
      try {
        return await fetchWithRetry(ENDPOINTS.CAPABILITIES);
      } catch (error) {
        console.error('[War Games] Capabilities fetch failed:', error);
        throw error;
      }
    },

    // Helper: get translated error message
    translateError(error) {
      const msg = error?.message || String(error);

      if (msg.includes('404')) return t('ERROR_404');
      if (msg.includes('timeout') || msg.includes('Timeout')) return t('ERROR_TIMEOUT');
      if (msg.includes('JSON')) return t('ERROR_JSON');
      if (msg.includes('tunnel') || msg.includes('Tunnel')) return t('ERROR_TUNNEL_DOWN');
      if (msg.includes('Network')) return t('ERROR_NETWORK');

      return msg;
    }
  };
})();

// Export for browser
if (typeof window !== 'undefined') {
  window.WARGAMES_API = WARGAMES_API;
}

// Export for Node.js/modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WARGAMES_API;
}
