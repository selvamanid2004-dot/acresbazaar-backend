const https = require('https');

const API_KEY = process.env.RENDER_API_KEY || '';
const services = [
  { id: 'srv-dar7jao473hc73a501qg', name: 'Backend Web Service' },
  { id: 'srv-dar7jbff3r2c73beh0h0', name: 'Admin Panel' },
  { id: 'srv-dar7jbu0tbcc739ato70', name: 'Public Website' }
];

async function trigger() {
  for (const s of services) {
    await new Promise((resolve) => {
      const req = https.request({
        hostname: 'api.render.com',
        path: `/v1/services/${s.id}/deploys`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }, res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
          console.log(`[${s.name}] Triggered Deploy -> HTTP ${res.statusCode}: ${d.slice(0, 100)}`);
          resolve();
        });
      });
      req.write('{}');
      req.end();
    });
  }
}

trigger();
