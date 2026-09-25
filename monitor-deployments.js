const https = require('https');

const API_KEY = 'rnd_TiLjqLdPwUgQy54eGxE3AKJUHUla';
const SERVICES = [
  { id: 'srv-dar7jao473hc73a501qg', name: 'Backend Web Service', url: 'https://acresbazaar-backend.onrender.com' },
  { id: 'srv-dar7jbff3r2c73beh0h0', name: 'Admin Panel', url: 'https://acresbazaar-admin.onrender.com' },
  { id: 'srv-dar7jbu0tbcc739ato70', name: 'Public Website', url: 'https://acresbazaar-web.onrender.com' }
];

function renderApi(path) {
  return new Promise((resolve, reject) => {
    https.get({
      hostname: 'api.render.com',
      path: `/v1${path}`,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json'
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    }).on('error', reject);
  });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function monitor() {
  console.log('=== Monitoring Render Deployment Status ===\n');
  for (let round = 1; round <= 30; round++) {
    console.log(`[Check #${round}]`);
    let allLive = true;
    for (const svc of SERVICES) {
      const res = await renderApi(`/services/${svc.id}/deploys?limit=1`);
      const deploy = Array.isArray(res.data) ? res.data[0]?.deploy : null;
      const status = deploy?.status || 'unknown';
      console.log(`  • ${svc.name.padEnd(22)}: Status [${status.toUpperCase()}] | Commit: ${deploy?.commit?.id?.slice(0,7) || 'N/A'}`);
      if (status !== 'live') {
        allLive = false;
      }
    }
    if (allLive) {
      console.log('\n🎉 ALL SERVICES ARE LIVE ON RENDER!');
      break;
    }
    await sleep(10000);
  }
}

monitor().catch(console.error);
