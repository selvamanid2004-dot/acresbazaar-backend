const https = require('https');

const API_KEY = 'rnd_TiLjqLdPwUgQy54eGxE3AKJUHUla';
const OWNER_ID = 'tea-dap6flgae00c7398gg5g';

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

async function main() {
  console.log('=== 1. Creating PostgreSQL Database on Render ===');
  const dbPayload = {
    name: 'acresbazaar-db',
    ownerId: OWNER_ID,
    plan: 'free',
    databaseName: 'acresbazaar',
    databaseUser: 'acresbazaar_user',
    region: 'singapore',
    version: '16'
  };

  const createDbRes = await renderApi('/postgres', 'POST', dbPayload);
  console.log('Create DB Response Status:', createDbRes.status);
  console.log('Create DB Response Data:', JSON.stringify(createDbRes.data, null, 2));

  const postgresId = createDbRes.data?.id;
  if (!postgresId) {
    console.error('Failed to get PostgreSQL ID');
    return;
  }

  console.log(`\n=== 2. Polling for Database (${postgresId}) to become available... ===`);
  let dbUrl = null;
  for (let i = 0; i < 30; i++) {
    await sleep(5000);
    const getDbRes = await renderApi(`/postgres/${postgresId}`);
    const status = getDbRes.data?.status;
    console.log(`[Poll ${i+1}] DB Status: ${status}`);
    if (status === 'available') {
      const connRes = await renderApi(`/postgres/${postgresId}/connection-info`);
      console.log('Connection Info:', JSON.stringify(connRes.data, null, 2));
      dbUrl = connRes.data?.internalConnectionString || connRes.data?.externalConnectionString;
      console.log('Obtained Database URL:', dbUrl);
      break;
    }
  }
}

main().catch(console.error);
