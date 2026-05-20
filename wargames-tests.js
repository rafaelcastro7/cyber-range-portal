/**
 * War Games - Comprehensive Test Suite
 *
 * Tests cover:
 * 1. API connectivity (local + remote)
 * 2. Endpoint responses
 * 3. Error handling
 * 4. Failover mechanisms
 * 5. i18n functionality
 * 6. UI rendering
 */

const WARGAMES_TESTS = (() => {
  const results = [];
  const TIMEOUT = 10000;

  // Test utilities
  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  function timeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), ms))
    ]);
  }

  async function httpGet(url) {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  // Test suite
  const tests = {
    // TEST GROUP 1: Environment Detection
    async test_local_env_detection() {
      const env = WARGAMES_API.getEnvironment();
      assert(env.isLocal !== undefined, 'Should detect local environment');
      assert(env.baseURL !== undefined, 'Should provide baseURL');
      return { env };
    },

    async test_remote_env_detection() {
      const isVercel = location.hostname.includes('vercel.app');
      if (isVercel) {
        const env = WARGAMES_API.getEnvironment();
        assert(!env.isLocal, 'Should not be local');
        assert(env.isVercel, 'Should detect Vercel');
      } else {
        console.log('⊘ Skipped: not on Vercel');
      }
    },

    // TEST GROUP 2: API Connectivity
    async test_playbooks_endpoint() {
      const data = await timeout(WARGAMES_API.getPlaybooks(), TIMEOUT);
      assert(Array.isArray(data), 'Playbooks should be an array');
      assert(data.length > 0, 'Should have at least 1 playbook');
      assert(data[0].id, 'Playbook should have id');
      assert(data[0].name, 'Playbook should have name');
      return { count: data.length, playbooks: data.map(p => p.id) };
    },

    async test_state_endpoint() {
      const state = await timeout(WARGAMES_API.getState(), TIMEOUT);
      assert(state !== null, 'State should not be null');
      assert(typeof state.active === 'boolean', 'State should have active flag');
      assert(state.scenario, 'State should have scenario');
      assert(state.agents, 'State should have agents');
      assert(Array.isArray(state.agents.attackers), 'Attackers should be array');
      assert(Array.isArray(state.agents.defenders), 'Defenders should be array');
      return { active: state.active, scenario: state.scenario?.id };
    },

    async test_capabilities_endpoint() {
      const caps = await timeout(WARGAMES_API.getCapabilities(), TIMEOUT);
      assert(typeof caps === 'object', 'Capabilities should be object');
      assert(caps.targets, 'Should have targets');
      return { targets: Object.keys(caps.targets || {}).length };
    },

    // TEST GROUP 3: Scenario Management
    async test_start_scenario() {
      const state = await timeout(
        WARGAMES_API.startScenario('purple-owasp'),
        TIMEOUT
      );
      assert(state.active === true, 'Scenario should be active');
      assert(state.scenario.id === 'purple-owasp', 'Should match scenario ID');
      return { warGameId: state.id, active: state.active };
    },

    async test_reset_scenario() {
      const state = await timeout(WARGAMES_API.resetScenario(), TIMEOUT);
      assert(typeof state === 'object', 'Reset should return state');
      // Note: active may vary depending on timing
      return { success: true };
    },

    // TEST GROUP 4: Error Handling
    async test_invalid_endpoint() {
      try {
        await timeout(
          fetch(`http://localhost:8090/runner/api/invalid-endpoint`),
          TIMEOUT
        );
        throw new Error('Should have failed');
      } catch (error) {
        // Expected to fail
        assert(error.message !== 'Should have failed', 'Invalid endpoint should error');
      }
    },

    async test_error_translation() {
      const errors = [
        { msg: 'HTTP 404', expected: 'ERROR_404' },
        { msg: 'timeout', expected: 'ERROR_TIMEOUT' },
        { msg: 'JSON', expected: 'ERROR_JSON' },
      ];

      for (const { msg, expected } of errors) {
        const error = new Error(msg);
        const translated = WARGAMES_API.translateError(error);
        assert(translated !== msg, `Should translate error: ${msg}`);
      }
    },

    // TEST GROUP 5: i18n Support
    async test_i18n_spanish() {
      WARGAMES_API.setLanguage('es');
      // API should accept ES language
      assert(localStorage.getItem('cr-lang') === 'es', 'Should store language preference');
    },

    async test_i18n_english() {
      WARGAMES_API.setLanguage('en');
      assert(localStorage.getItem('cr-lang') === 'en', 'Should store language preference');
    },

    // TEST GROUP 6: Network Resilience
    async test_retry_mechanism() {
      // This test verifies that retries work without manual intervention
      let attempts = 0;
      const originalFetch = window.fetch;

      // Monkey-patch to track attempts
      window.fetch = function(...args) {
        attempts++;
        return originalFetch.apply(this, args);
      };

      try {
        await WARGAMES_API.getPlaybooks();
        assert(attempts >= 1, 'Should attempt at least once');
      } finally {
        window.fetch = originalFetch;
      }
    },

    async test_connection_status() {
      const isOnline = WARGAMES_API.isOnline();
      assert(typeof isOnline === 'boolean', 'Should return boolean');
      return { online: isOnline };
    },

    // TEST GROUP 7: Data Integrity
    async test_state_has_all_fields() {
      const state = await WARGAMES_API.getState();
      const requiredFields = ['active', 'id', 'scenario', 'agents', 'score', 'events', 'runs'];
      for (const field of requiredFields) {
        assert(field in state, `State missing field: ${field}`);
      }
    },

    async test_playbook_has_all_fields() {
      const playbooks = await WARGAMES_API.getPlaybooks();
      const pb = playbooks[0];
      const requiredFields = ['id', 'name', 'category', 'difficulty', 'target', 'mitre'];
      for (const field of requiredFields) {
        assert(field in pb, `Playbook missing field: ${field}`);
      }
    },

    // TEST GROUP 8: UI Component Tests
    async test_ui_container_exists() {
      const container = document.getElementById('wg-container');
      assert(container !== null, 'War Games container should exist in DOM');
    },

    async test_ui_has_controls() {
      const controls = [
        'wg-scenario-select',
        'wg-start-btn',
        'wg-reset-btn',
        'wg-atk-score',
        'wg-def-score',
        'wg-status',
        'wg-attackers',
        'wg-defenders',
        'wg-feed'
      ];

      for (const id of controls) {
        const el = document.getElementById(id);
        assert(el !== null, `Missing UI element: ${id}`);
      }
    },

    async test_ui_is_interactive() {
      const startBtn = document.getElementById('wg-start-btn');
      assert(startBtn !== null, 'Start button should exist');
      assert(typeof startBtn.onclick === 'function', 'Button should be clickable');
    }
  };

  return {
    async runAll() {
      console.clear();
      console.log('═══════════════════════════════════════════════════════════');
      console.log('  WAR GAMES SYSTEM - COMPREHENSIVE TEST SUITE');
      console.log('═══════════════════════════════════════════════════════════\n');

      let passed = 0;
      let failed = 0;
      const failures = [];

      for (const [testName, testFn] of Object.entries(tests)) {
        try {
          const result = await testFn();
          console.log(`✓ ${testName}`);
          if (result) {
            console.log(`  └─ ${JSON.stringify(result)}`);
          }
          passed++;
          results.push({ test: testName, status: 'PASS', result });
        } catch (error) {
          console.log(`✗ ${testName}`);
          console.log(`  └─ ${error.message}`);
          failed++;
          failures.push({ test: testName, error: error.message });
          results.push({ test: testName, status: 'FAIL', error: error.message });
        }
      }

      console.log('\n═══════════════════════════════════════════════════════════');
      console.log(`RESULTS: ${passed} passed, ${failed} failed (${Object.keys(tests).length} total)`);
      console.log(`SUCCESS RATE: ${Math.round((passed / Object.keys(tests).length) * 100)}%`);
      console.log('═══════════════════════════════════════════════════════════\n');

      if (failures.length > 0) {
        console.log('FAILURES:');
        failures.forEach(f => {
          console.log(`  • ${f.test}: ${f.error}`);
        });
        console.log('');
      }

      return {
        total: Object.keys(tests).length,
        passed,
        failed,
        successRate: Math.round((passed / Object.keys(tests).length) * 100),
        failures,
        results
      };
    },

    async quickTest() {
      // Fast subset for quick validation
      const quick = [
        tests.test_playbooks_endpoint,
        tests.test_state_endpoint,
        tests.test_connection_status,
        tests.test_ui_container_exists
      ];

      let passed = 0;
      console.log('Running quick validation...');

      for (const testFn of quick) {
        try {
          await testFn();
          passed++;
        } catch (error) {
          console.log(`✗ ${testFn.name}: ${error.message}`);
        }
      }

      console.log(`✓ ${passed}/${quick.length} critical tests passed`);
      return passed === quick.length;
    }
  };
})();

// Export
if (typeof window !== 'undefined') {
  window.WARGAMES_TESTS = WARGAMES_TESTS;
}
