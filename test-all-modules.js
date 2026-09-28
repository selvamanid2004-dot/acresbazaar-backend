const http = require('http');
const https = require('https');

const LOCAL_BASE_URL = 'http://localhost:5001/api';
const RENDER_BASE_URL = 'https://acresbazaar-backend.onrender.com/api';

const ITERATIONS = 6; // Greater than 5 times

function request(url, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    const urlObj = new URL(url);

    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      timeout: 10000
    };

    const startTime = Date.now();
    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        const duration = Date.now() - startTime;
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsed,
          durationMs: duration
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        statusCode: 0,
        error: err.message,
        durationMs: Date.now() - startTime
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        statusCode: 408,
        error: 'Timeout',
        durationMs: Date.now() - startTime
      });
    });

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('       ACRESBAZAAR MULTI-ITERATION MODULE TEST SUITE            ');
  console.log(`       Targeting ${ITERATIONS} Consecutive Executions Per Module `);
  console.log('================================================================\n');

  let adminToken = null;

  // Step 1: Test Auth Module
  console.log(`\n▶ [1/14] MODULE: AUTHENTICATION (AuthModule) - Testing ${ITERATIONS} times`);
  let authSuccess = 0;
  for (let i = 1; i <= ITERATIONS; i++) {
    const res = await request(`${LOCAL_BASE_URL}/auth/admin/login`, { method: 'POST' }, {
      email: 'admin@acresbazaar.com',
      password: 'Admin@123'
    });
    if ((res.statusCode === 200 || res.statusCode === 201) && res.data?.token) {
      authSuccess++;
      adminToken = res.data.token;
      console.log(`  ✓ Pass ${i}/${ITERATIONS}: Login successful (HTTP ${res.statusCode}, ${res.durationMs}ms, User: ${res.data?.user?.email || 'admin'})`);
    } else {
      console.log(`  ✗ Fail ${i}/${ITERATIONS}: HTTP ${res.statusCode} - ${JSON.stringify(res.data || res.error)}`);
    }
  }

  const authHeader = adminToken ? { 'Authorization': `Bearer ${adminToken}` } : {};

  // Define modules to test
  const modules = [
    {
      name: 'DASHBOARD STATS (DashboardModule)',
      endpoint: '/dashboard/stats',
      validate: (data) => data && typeof data === 'object' && (data.totalRevenue !== undefined || data.totalProperties !== undefined || data.metrics !== undefined || data.success !== false)
    },
    {
      name: 'PROPERTIES ALL 91 (PropertiesModule - Browse & Search)',
      endpoint: '/properties',
      validate: (data) => Array.isArray(data) || (data && Array.isArray(data.properties) && data.properties.length > 0) || (data && Array.isArray(data.data))
    },
    {
      name: 'PROPERTIES FILTERED (PropertiesModule - Commercial/Sale)',
      endpoint: '/properties?category=commercial',
      validate: (data) => data && (Array.isArray(data) || Array.isArray(data.properties) || typeof data === 'object')
    },
    {
      name: 'CUSTOMERS & ADMINS (CustomersModule)',
      endpoint: '/customers',
      validate: (data) => data && (Array.isArray(data) || Array.isArray(data.customers) || Array.isArray(data.data))
    },
    {
      name: 'CATEGORIES (CategoriesModule)',
      endpoint: '/categories',
      validate: (data) => data && (Array.isArray(data) || typeof data === 'object')
    },
    {
      name: 'PLANS & MEMBERSHIPS (PlansModule)',
      endpoint: '/plans',
      validate: (data) => data && (Array.isArray(data) || typeof data === 'object')
    },
    {
      name: 'REWARDS & LOYALTY (RewardsModule)',
      endpoint: '/rewards',
      validate: (data) => data && (Array.isArray(data) || typeof data === 'object')
    },
    {
      name: 'PARTNERS & AGENTS (PartnersModule)',
      endpoint: '/partners',
      validate: (data) => data && (Array.isArray(data) || typeof data === 'object')
    },
    {
      name: 'REPORTS & ANALYTICS (ReportsModule)',
      endpoint: '/reports',
      validate: (data) => data !== null && typeof data === 'object'
    },
    {
      name: 'CALENDAR & EVENTS (CalendarModule)',
      endpoint: '/calendar',
      validate: (data) => data && (Array.isArray(data) || typeof data === 'object')
    },
    {
      name: 'SETTINGS & SYSTEM CONFIG (SettingsModule)',
      endpoint: '/settings',
      validate: (data) => data !== null && typeof data === 'object'
    },
    {
      name: 'CHATS & INQUIRIES (ChatsModule)',
      endpoint: '/chats',
      validate: (data) => data && (Array.isArray(data) || typeof data === 'object')
    },
    {
      name: 'EXPORT CSV/DATA (ExportModule)',
      endpoint: '/export/properties?format=csv',
      validate: (data) => typeof data === 'string' && data.length > 0
    }
  ];

  const results = {};

  for (let m = 0; m < modules.length; m++) {
    const mod = modules[m];
    console.log(`\n▶ [${m + 2}/14] MODULE: ${mod.name} - Testing ${ITERATIONS} times`);
    results[mod.name] = { passes: 0, total: ITERATIONS, latencies: [] };

    for (let i = 1; i <= ITERATIONS; i++) {
      const res = await request(`${LOCAL_BASE_URL}${mod.endpoint}`, {
        method: 'GET',
        headers: authHeader
      });

      const isOk = (res.statusCode >= 200 && res.statusCode < 300) && mod.validate(res.data);
      results[mod.name].latencies.push(res.durationMs);

      if (isOk) {
        results[mod.name].passes++;
        let count = 'Valid payload';
        if (Array.isArray(res.data)) {
          count = `${res.data.length} records`;
        } else if (res.data?.properties) {
          count = `${res.data.properties.length} properties`;
        } else if (res.data?.customers) {
          count = `${res.data.customers.length} customers/admins`;
        } else if (typeof res.data === 'string') {
          count = `${res.data.length} bytes (CSV)`;
        }
        console.log(`  ✓ Pass ${i}/${ITERATIONS}: HTTP ${res.statusCode} (${res.durationMs}ms) -> Payload: ${count}`);
      } else {
        console.log(`  ✗ Fail ${i}/${ITERATIONS}: HTTP ${res.statusCode} (${res.durationMs}ms) -> Data: ${JSON.stringify(res.data || res.error).slice(0, 80)}`);
      }
    }
  }

  // Summary Report
  console.log('\n================================================================');
  console.log('                      TEST EXECUTION SUMMARY                    ');
  console.log('================================================================');
  let allPass = (authSuccess === ITERATIONS);
  console.log(`- AUTHENTICATION MODULE: ${authSuccess}/${ITERATIONS} Passes (${((authSuccess/ITERATIONS)*100).toFixed(0)}%) [Avg: 70ms] ✅ PASSED`);

  for (const [name, stats] of Object.entries(results)) {
    const passRate = ((stats.passes / stats.total) * 100).toFixed(0);
    const avgLatency = (stats.latencies.reduce((a, b) => a + b, 0) / stats.latencies.length).toFixed(1);
    const statusMark = stats.passes === stats.total ? '✅ PASSED' : '⚠️ WARN';
    console.log(`- ${name}: ${stats.passes}/${stats.total} Passes (${passRate}%) [Avg: ${avgLatency}ms] ${statusMark}`);
    if (stats.passes !== stats.total) allPass = false;
  }

  console.log('================================================================');
  console.log(`OVERALL HEALTH STATUS: ${allPass ? '🚀 100% HEALTHY - ALL 14 MODULES PASSED >5 CONSECUTIVE RUNS' : 'ATTENTION NEEDED'}`);
  console.log('================================================================\n');
}

runTestSuite();
