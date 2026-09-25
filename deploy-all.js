const https = require('https');

const API_KEY = 'rnd_TiLjqLdPwUgQy54eGxE3AKJUHUla';
const OWNER_ID = 'tea-dap6flgae00c7398gg5g';
const DB_ID = 'dpg-dar7io942hec73d9ori0-a';

function renderApi(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.render.com',
      path: `/v1${path}`,
      method,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, (res) => {
      let resBody = '';
      res.on('data', chunk => resBody += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(resBody);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data: resBody });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function deploy() {
  console.log('================================================================');
  console.log('       ACRESBAZAAR AUTOMATED RENDER CLOUD DEPLOYMENT            ');
  console.log('================================================================\n');

  // STEP 1: Wait for PostgreSQL database to be available
  console.log(`[1/4] Checking PostgreSQL database (${DB_ID}) status...`);
  let dbInternalUrl = null;
  let dbExternalUrl = null;

  for (let i = 0; i < 40; i++) {
    const dbRes = await renderApi(`/postgres/${DB_ID}`);
    const status = dbRes.data?.status;
    console.log(`  Database status: ${status} (attempt ${i+1}/40)...`);
    if (status === 'available') {
      const connRes = await renderApi(`/postgres/${DB_ID}/connection-info`);
      dbInternalUrl = connRes.data?.internalConnectionString;
      dbExternalUrl = connRes.data?.externalConnectionString;
      console.log('  ✔ PostgreSQL is LIVE!');
      console.log(`  ✔ Internal Connection String: ${dbInternalUrl ? 'Acquired' : 'Pending'}`);
      break;
    }
    await sleep(6000);
  }

  if (!dbInternalUrl && !dbExternalUrl) {
    throw new Error('Could not get connection string for PostgreSQL database.');
  }

  const databaseUrl = dbInternalUrl || dbExternalUrl;

  // STEP 2: Deploy Backend Web Service
  console.log('\n[2/4] Deploying Backend Web Service (acresbazaar-backend)...');
  const backendPayload = {
    type: 'web_service',
    name: 'acresbazaar-backend',
    ownerId: OWNER_ID,
    repo: 'https://github.com/selvamanid2004-dot/acresbazaar-backend',
    branch: 'main',
    autoDeploy: 'yes',
    serviceDetails: {
      env: 'node',
      region: 'singapore',
      plan: 'free',
      envSpecificDetails: {
        buildCommand: 'npm install && npm run build:render',
        startCommand: 'npm run start'
      }
    },
    envVars: [
      { key: 'DATABASE_URL', value: databaseUrl },
      { key: 'PORT', value: '10000' },
      { key: 'JWT_SECRET', value: 'acresbazaar_prod_jwt_secret_super_2026' },
      { key: 'JWT_EXPIRES_IN', value: '7d' },
      { key: 'NODE_ENV', value: 'production' }
    ]
  };

  const backendRes = await renderApi('/services', 'POST', backendPayload);
  console.log(`  Backend creation status: ${backendRes.status}`);
  const backendId = backendRes.data?.service?.id || backendRes.data?.id;
  const backendUrl = backendRes.data?.service?.serviceDetails?.url || `https://${backendRes.data?.service?.slug || 'acresbazaar-backend'}.onrender.com`;
  console.log(`  ✔ Backend Service ID: ${backendId}`);
  console.log(`  ✔ Backend Service Live URL: ${backendUrl}`);

  // STEP 3: Deploy Admin Panel Static Site
  console.log('\n[3/4] Deploying Admin Panel Static Site (acresbazaar-admin)...');
  const adminPayload = {
    type: 'static_site',
    name: 'acresbazaar-admin',
    ownerId: OWNER_ID,
    repo: 'https://github.com/selvamanid2004-dot/acresbazaar-frontend',
    branch: 'main',
    autoDeploy: 'yes',
    rootDir: 'admin-panel',
    serviceDetails: {
      buildCommand: 'npm install && npm run build',
      publishPath: 'dist',
      routes: [
        {
          type: 'rewrite',
          source: '/*',
          destination: '/index.html'
        }
      ]
    },
    envVars: [
      { key: 'VITE_API_URL', value: `${backendUrl}/api` }
    ]
  };

  const adminRes = await renderApi('/services', 'POST', adminPayload);
  console.log(`  Admin Panel creation status: ${adminRes.status}`);
  const adminId = adminRes.data?.service?.id || adminRes.data?.id;
  const adminUrl = adminRes.data?.service?.serviceDetails?.url || `https://${adminRes.data?.service?.slug || 'acresbazaar-admin'}.onrender.com`;
  console.log(`  ✔ Admin Panel Service ID: ${adminId}`);
  console.log(`  ✔ Admin Panel Live URL: ${adminUrl}`);

  // STEP 4: Deploy Main Public Website Static Site
  console.log('\n[4/4] Deploying Public Website Static Site (acresbazaar-web)...');
  const webPayload = {
    type: 'static_site',
    name: 'acresbazaar-web',
    ownerId: OWNER_ID,
    repo: 'https://github.com/selvamanid2004-dot/acresbazaar-frontend',
    branch: 'main',
    autoDeploy: 'yes',
    rootDir: '',
    serviceDetails: {
      buildCommand: 'npm install && npm run build',
      publishPath: 'dist/real-estate-web/browser',
      routes: [
        {
          type: 'rewrite',
          source: '/*',
          destination: '/index.html'
        }
      ]
    }
  };

  const webRes = await renderApi('/services', 'POST', webPayload);
  console.log(`  Public Website creation status: ${webRes.status}`);
  const webId = webRes.data?.service?.id || webRes.data?.id;
  const webUrl = webRes.data?.service?.serviceDetails?.url || `https://${webRes.data?.service?.slug || 'acresbazaar-web'}.onrender.com`;
  console.log(`  ✔ Public Website Service ID: ${webId}`);
  console.log(`  ✔ Public Website Live URL: ${webUrl}`);

  console.log('\n================================================================');
  console.log('                  DEPLOYMENT INITIATED                          ');
  console.log('================================================================');
  console.log(`🔗 Database:        ${DB_ID} (PostgreSQL 16)`);
  console.log(`🔗 Backend API:     ${backendUrl}`);
  console.log(`🔗 Admin Panel:     ${adminUrl}`);
  console.log(`🔗 Public Website:  ${webUrl}`);
  console.log('================================================================\n');
}

deploy().catch(console.error);
