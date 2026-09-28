const https = require('https');

const RENDER_BASE_URL = 'https://acresbazaar-backend.onrender.com/api';
const ITERATIONS = 6;

function request(url, options = {}, postData = null) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      timeout: 15000
    };

    const startTime = Date.now();
    const req = https.request(reqOptions, (res) => {
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

async function testRender() {
  console.log('================================================================');
  console.log('    TESTING LIVE RENDER DEPLOYED MODULES (6x RUNS WITH AUTH)    ');
  console.log('================================================================\n');

  // Authenticate first
  const loginRes = await request(`${RENDER_BASE_URL}/auth/admin/login`, { method: 'POST' }, {
    email: 'admin@acresbazaar.com',
    password: 'Admin@123'
  });

  let token = loginRes.data?.token;
  console.log(`Render Auth Status: HTTP ${loginRes.statusCode} (${loginRes.durationMs}ms) - Token: ${token ? 'Obtained' : 'Failed'}`);

  const authHeader = token ? { 'Authorization': `Bearer ${token}` } : {};

  const endpoints = [
    { name: 'Live Properties API', path: '/properties' },
    { name: 'Live Customers API', path: '/customers' },
    { name: 'Live Categories API', path: '/categories' },
    { name: 'Live Plans API', path: '/plans' },
    { name: 'Live Rewards API', path: '/rewards' },
    { name: 'Live Partners API', path: '/partners' },
    { name: 'Live Reports API', path: '/reports' }
  ];

  for (const ep of endpoints) {
    console.log(`\n▶ Testing ${ep.name} (${RENDER_BASE_URL}${ep.path})`);
    let pass = 0;
    for (let i = 1; i <= ITERATIONS; i++) {
      const res = await request(`${RENDER_BASE_URL}${ep.path}`, { headers: authHeader });
      if (res.statusCode >= 200 && res.statusCode < 300) {
        pass++;
        console.log(`  ✓ Pass ${i}/${ITERATIONS}: HTTP ${res.statusCode} (${res.durationMs}ms)`);
      } else {
        console.log(`  ✗ Fail ${i}/${ITERATIONS}: HTTP ${res.statusCode} (${res.durationMs}ms) -> ${JSON.stringify(res.data || res.error).slice(0, 50)}`);
      }
    }
    console.log(`  Result: ${pass}/${ITERATIONS} Passed (${((pass/ITERATIONS)*100).toFixed(0)}%)`);
  }
}

testRender();
