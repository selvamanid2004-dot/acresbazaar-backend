const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

function post(url, body, headers = {}) {
  const mod = url.startsWith('https') ? https : http;
  const u = new URL(url);
  return new Promise((resolve, reject) => {
    const r = mod.request({
      hostname: u.hostname,
      port: u.port || (url.startsWith('https') ? 443 : 80),
      path: u.pathname + u.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers }
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
        catch(e) { resolve({ status: res.statusCode, raw: d }); }
      });
    });
    r.on('error', reject);
    r.write(JSON.stringify(body));
    r.end();
  });
}

function patch(url, body, headers = {}) {
  const mod = url.startsWith('https') ? https : http;
  const u = new URL(url);
  return new Promise((resolve, reject) => {
    const r = mod.request({
      hostname: u.hostname,
      port: u.port || (url.startsWith('https') ? 443 : 80),
      path: u.pathname + u.search,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...headers }
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
        catch(e) { resolve({ status: res.statusCode, raw: d }); }
      });
    });
    r.on('error', reject);
    r.write(JSON.stringify(body));
    r.end();
  });
}

function get(url, headers = {}) {
  const mod = url.startsWith('https') ? https : http;
  const u = new URL(url);
  return new Promise((resolve, reject) => {
    const r = mod.request({
      hostname: u.hostname,
      port: u.port || (url.startsWith('https') ? 443 : 80),
      path: u.pathname + u.search,
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...headers }
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
        catch(e) { resolve({ status: res.statusCode, raw: d }); }
      });
    });
    r.on('error', reject);
    r.end();
  });
}

const DEFAULT_CATEGORIES = [
  { name: 'Plots / Land', slug: 'plots', description: 'Gated community and residential plots with clear legal approvals.', imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=600&q=80', displayOrder: 1 },
  { name: 'Villas & Estates', slug: 'villas', description: 'Luxury independent villas, private duplex residences and gated estates.', imageUrl: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=600&q=80', displayOrder: 2 },
  { name: 'Apartments / Flats', slug: 'apartments', description: 'Premium high-rise apartments, luxury flats and modern residential towers.', imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80', displayOrder: 3 },
  { name: 'Independent Houses', slug: 'independent-houses', description: 'Standalone residential homes, duplex houses, and independent properties.', imageUrl: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=600&q=80', displayOrder: 4 },
  { name: 'Commercial Spaces', slug: 'commercial', description: 'Prime retail showrooms, tech park offices, and commercial spaces.', imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80', displayOrder: 5 },
  { name: 'Agricultural & Farm Lands', slug: 'farm-lands', description: 'Fertile managed farmlands, organic plantation parcels and agro-estates.', imageUrl: 'https://images.unsplash.com/photo-1500076656116-558758c991c1?auto=format&fit=crop&w=600&q=80', displayOrder: 6 }
];

async function syncModulesFor(baseUrl) {
  console.log(`\n▶ Syncing Admin Modules for: ${baseUrl}`);
  const authRes = await post(`${baseUrl}/auth/admin/login`, {
    email: 'admin@acresbazaar.com',
    password: 'Admin@123'
  });
  const token = authRes.data?.token;
  if (!token) {
    console.error(`  ❌ Failed login for ${baseUrl}`);
    return;
  }
  const headers = { Authorization: `Bearer ${token}` };

  // 1. Categories
  const catRes = await get(`${baseUrl}/categories`, headers);
  const currentCats = catRes.data?.categories || [];
  console.log(`  Categories in DB: ${currentCats.length}`);
  if (currentCats.length < 6) {
    for (const cat of DEFAULT_CATEGORIES) {
      const exists = currentCats.some(c => c.slug === cat.slug);
      if (!exists) {
        const created = await post(`${baseUrl}/categories`, cat, headers);
        console.log(`    + Created Category: ${cat.name} (Status: ${created.status})`);
      }
    }
  }

  // 2. Verified Partners
  const partRes = await get(`${baseUrl}/partners`, headers);
  const currentParts = Array.isArray(partRes.data) ? partRes.data : partRes.data?.partners || [];
  console.log(`  Partners in DB: ${currentParts.length}`);
  if (currentParts.length === 0) {
    const seedPartners = [
      { name: 'Prestige Realty Advisors', type: 'Agency', company: 'Prestige Real Estate Pvt Ltd', mobile: '+91 98451 22334', email: 'advisors@prestigerealty.com' },
      { name: 'Horizon Estate Consultants', type: 'Broker', company: 'Horizon Properties Group', mobile: '+91 97410 44556', email: 'contact@horizonestates.in' },
      { name: 'Royal City Developers', type: 'Developer', company: 'Royal Urban Townships Ltd', mobile: '+91 99001 88990', email: 'sales@royalcity.com' }
    ];
    for (const p of seedPartners) {
      await post(`${baseUrl}/partners/register`, p);
      console.log(`    + Created Partner: ${p.name}`);
    }
  }

  // 3. Rewards / Spotter Claims
  const rewRes = await get(`${baseUrl}/rewards`, headers);
  const currentRews = Array.isArray(rewRes.data) ? rewRes.data : rewRes.data?.rewards || [];
  console.log(`  Rewards in DB: ${currentRews.length}`);
  if (currentRews.length === 0) {
    const seedRewards = [
      { userName: 'Vikram Spotter', userEmail: 'vikram.spotter@acresbazaar.com', userRole: 'COMMON_PEOPLE', propertyTitle: 'Luxury Villa in Whitefield', rewardTitle: 'Spot Property Reward (100 pts)', points: 100, amount: 1000, reason: '10 Uploads Completed', status: 'PENDING' },
      { userName: 'Ananya Sharma', userEmail: 'ananya.spotter@acresbazaar.com', userRole: 'COMMON_PEOPLE', propertyTitle: 'Commercial Space in Koramangala', rewardTitle: 'Spot Property Reward (100 pts)', points: 100, amount: 1000, reason: '10 Uploads Completed', status: 'APPROVED' }
    ];
    for (const r of seedRewards) {
      await post(`${baseUrl}/rewards/claim`, r);
      console.log(`    + Created Reward Claim: ${r.userName}`);
    }
  }

  // 4. Reports / Support Inquiries
  const repRes = await get(`${baseUrl}/reports`, headers);
  const currentReps = Array.isArray(repRes.data) ? repRes.data : repRes.data?.reports || [];
  console.log(`  Reports in DB: ${currentReps.length}`);
  if (currentReps.length === 0) {
    const seedReports = [
      { propertyTitle: 'Skyline Zenith Heights', category: 'Flats', userName: 'Rajesh Buyer', userEmail: 'rajesh.buyer@acresbazaar.com', userPhone: '+91 98800 12345', reason: 'Price Inquiry & Site Visit Request', description: 'Requesting site inspection for 3 BHK flat on upcoming Saturday.', status: 'PENDING' },
      { propertyTitle: 'Green Meadows Luxury Villa', category: 'Villas', userName: 'Deepak Kumar', userEmail: 'deepak.buyer@acresbazaar.com', userPhone: '+91 97700 67890', reason: 'Documentation Verification Request', description: 'Requesting verified title deed and approved layout blueprint.', status: 'RESOLVED' }
    ];
    for (const rep of seedReports) {
      await post(`${baseUrl}/reports`, rep);
      console.log(`    + Created Report/Inquiry: ${rep.userName}`);
    }
  }

  console.log(`✔ Synced modules for ${baseUrl} successfully!`);
}

async function run() {
  await syncModulesFor('http://localhost:5001/api');
  await syncModulesFor('https://acresbazaar-backend.onrender.com/api');
}

run();
