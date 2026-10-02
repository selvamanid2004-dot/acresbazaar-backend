const https = require('https');
const http = require('http');

function request(url, options = {}, postData = null) {
  const mod = url.startsWith('https') ? https : http;
  const u = new URL(url);
  return new Promise((resolve) => {
    const startTime = Date.now();
    const req = mod.request({
      hostname: u.hostname,
      port: u.port || (url.startsWith('https') ? 443 : 80),
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      timeout: 15000
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(data); } catch(e) { parsed = data; }
        resolve({
          statusCode: res.statusCode,
          data: parsed,
          durationMs: Date.now() - startTime
        });
      });
    });

    req.on('error', (err) => resolve({ statusCode: 0, error: err.message, durationMs: Date.now() - startTime }));
    req.on('timeout', () => { req.destroy(); resolve({ statusCode: 408, error: 'Timeout', durationMs: Date.now() - startTime }); });

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function auditEnvironment(name, baseUrl) {
  console.log(`\n================================================================`);
  console.log(`       AUDITING ${name.toUpperCase()} (${baseUrl})`);
  console.log(`================================================================\n`);

  // 1. Admin Authentication
  console.log('▶ [1/15] Admin Authentication Module');
  const loginRes = await request(`${baseUrl}/auth/admin/login`, { method: 'POST' }, {
    email: 'admin@acresbazaar.com',
    password: 'Admin@123'
  });
  const token = loginRes.data?.token;
  console.log(`  Login Status: HTTP ${loginRes.statusCode} (${loginRes.durationMs}ms) | Token: ${token ? 'VALID' : 'FAILED'}`);
  if (!token) {
    console.error(`  ❌ Critical: Cannot proceed with audit without valid token for ${name}`);
    return;
  }
  const headers = { Authorization: `Bearer ${token}` };

  // 2. Dashboard & Stats
  console.log('▶ [2/15] Dashboard & Analytics Summary Module');
  const dashProps = await request(`${baseUrl}/properties`, { headers });
  const dashCusts = await request(`${baseUrl}/customers`, { headers });
  const dashSettings = await request(`${baseUrl}/settings`, { headers });
  console.log(`  Properties: ${dashProps.statusCode === 200 ? 'OK (' + (dashProps.data?.properties?.length || dashProps.data?.count) + ' items)' : 'FAIL HTTP ' + dashProps.statusCode}`);
  console.log(`  Customers: ${dashCusts.statusCode === 200 ? 'OK (' + (dashCusts.data?.length || dashCusts.data?.count || '0') + ' items)' : 'FAIL HTTP ' + dashCusts.statusCode}`);
  console.log(`  Settings: ${dashSettings.statusCode === 200 ? 'OK (' + Object.keys(dashSettings.data?.settings || {}).length + ' keys)' : 'FAIL HTTP ' + dashSettings.statusCode}`);

  // 3. Properties Module
  console.log('▶ [3/15] Properties Management Module');
  const propList = await request(`${baseUrl}/properties`, { headers });
  console.log(`  GET /properties: HTTP ${propList.statusCode} (${propList.data?.properties?.length || 0} properties)`);
  if (propList.data?.properties && propList.data.properties.length > 0) {
    const firstProp = propList.data.properties[0];
    const singleProp = await request(`${baseUrl}/properties/${firstProp.id}`, { headers });
    console.log(`  GET /properties/${firstProp.id}: HTTP ${singleProp.statusCode} | Title: "${firstProp.title.slice(0, 30)}..."`);
  }

  // 4. Snap Properties Module
  console.log('▶ [4/15] Snap Properties Module');
  const snapList = await request(`${baseUrl}/properties?isSnap=true`, { headers });
  console.log(`  GET /properties?isSnap=true: HTTP ${snapList.statusCode} (${snapList.data?.properties?.length || 0} snap properties)`);

  // 5. Categories Module
  console.log('▶ [5/15] Categories Management Module');
  const catList = await request(`${baseUrl}/categories`, { headers });
  console.log(`  GET /categories: HTTP ${catList.statusCode} (${catList.data?.categories?.length || catList.data?.count || 0} categories)`);

  // 6. Membership Plans Module
  console.log('▶ [6/15] Membership Plans Module');
  const planList = await request(`${baseUrl}/plans`, { headers });
  console.log(`  GET /plans: HTTP ${planList.statusCode} (${planList.data?.plans?.length || planList.data?.count || 0} plans)`);

  // 7. Customers / Users Module
  console.log('▶ [7/15] Customers Module');
  const custList = await request(`${baseUrl}/customers`, { headers });
  console.log(`  GET /customers: HTTP ${custList.statusCode} (${custList.data?.customers?.length || custList.data?.count || 0} users)`);

  // 8. Bookings Module
  console.log('▶ [8/15] Bookings Module');
  const bookList = await request(`${baseUrl}/properties/admin/bookings`, { headers });
  console.log(`  GET /properties/admin/bookings: HTTP ${bookList.statusCode} (${bookList.data?.bookings?.length || 0} bookings)`);

  // 9. Rewards Module
  console.log('▶ [9/15] Spotter / Dealer Rewards Module');
  const rewList = await request(`${baseUrl}/rewards`, { headers });
  console.log(`  GET /rewards: HTTP ${rewList.statusCode} (${rewList.data?.rewards?.length || rewList.data?.count || 0} reward claims)`);

  // 10. Reports Module
  console.log('▶ [10/15] User Inquiries & Reports Module');
  const repList = await request(`${baseUrl}/reports`, { headers });
  console.log(`  GET /reports: HTTP ${repList.statusCode} (${repList.data?.reports?.length || repList.data?.count || 0} reports)`);

  // 11. Verified Partners Module
  console.log('▶ [11/15] Verified Partners Module');
  const partList = await request(`${baseUrl}/partners`, { headers });
  console.log(`  GET /partners: HTTP ${partList.statusCode} (${partList.data?.partners?.length || partList.data?.count || 0} partners)`);

  // 12. Staff Management Module
  console.log('▶ [12/15] Staff Management & Permissions Module');
  const staffList = await request(`${baseUrl}/staff`, { headers });
  const permList = await request(`${baseUrl}/staff/modules`, { headers });
  console.log(`  GET /staff: HTTP ${staffList.statusCode} (${staffList.data?.staff?.length || staffList.data?.length || 0} staff accounts)`);
  console.log(`  GET /staff/modules: HTTP ${permList.statusCode} (${permList.data?.modules?.length || 0} permission modules)`);

  // 13. Website Settings & Logo Module
  console.log('▶ [13/15] Website Settings & CMS Logo Module');
  const setList = await request(`${baseUrl}/settings`, { headers });
  const logoSetting = setList.data?.settings?.website_logo || setList.data?.settings?.logo_url;
  console.log(`  GET /settings: HTTP ${setList.statusCode} | Logo URL: ${logoSetting ? logoSetting : 'None'}`);
  const logoGroup = await request(`${baseUrl}/settings/group/logo`);
  console.log(`  GET /settings/group/logo: HTTP ${logoGroup.statusCode} | Group logo: ${logoGroup.data?.settings?.website_logo || logoGroup.data?.settings?.logo_url || 'None'}`);

  // 14. Data Export Module
  console.log('▶ [14/15] Data Export CSV / PDF / Print Module');
  const exportProps = await request(`${baseUrl}/export/properties?format=json`, { headers });
  const exportCusts = await request(`${baseUrl}/export/customers?format=json`, { headers });
  console.log(`  GET /export/properties: HTTP ${exportProps.statusCode}`);
  console.log(`  GET /export/customers: HTTP ${exportCusts.statusCode}`);

  // 15. Change Password / Security Module
  console.log('▶ [15/15] Admin Security & Profile Module');
  console.log(`  Admin Email: ${loginRes.data?.user?.email || 'admin@acresbazaar.com'} | Role: ${loginRes.data?.user?.role || 'SUPER_ADMIN'}`);
}

async function runAudit() {
  await auditEnvironment('Localhost Backend', 'http://localhost:5001/api');
  await auditEnvironment('Render Deployed Backend', 'https://acresbazaar-backend.onrender.com/api');
}

runAudit();
