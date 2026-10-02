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

async function sync() {
  console.log('====================================================');
  console.log('    SYNCING LOCALHOST DB TO RENDER CLOUD DB         ');
  console.log('====================================================\n');

  console.log('1. Authenticating with Render Admin...');
  const authRes = await post('https://acresbazaar-backend.onrender.com/api/auth/admin/login', {
    email: 'admin@acresbazaar.com',
    password: 'Admin@123'
  });
  const token = authRes.data?.token;
  if (!token) {
    console.error('Failed to log in to Render:', authRes);
    return;
  }
  console.log('✔ Authenticated with Render successfully!');
  const authHeaders = { Authorization: 'Bearer ' + token };

  console.log('\n2. Syncing Website Logo to Render...');
  const logoPath = path.join(process.cwd(), 'uploads', 'logo-1790321825874.jpg');
  if (fs.existsSync(logoPath)) {
    const base64 = 'data:image/jpeg;base64,' + fs.readFileSync(logoPath).toString('base64');
    const uploadRes = await post('https://acresbazaar-backend.onrender.com/api/settings/upload-logo', {
      image: base64,
      fileName: 'website-logo.jpg'
    }, authHeaders);
    console.log('✔ Logo upload status:', uploadRes.status, uploadRes.data?.message || uploadRes.data);
  } else {
    console.log('Logo file not found at:', logoPath);
  }

  console.log('\n3. Fetching Local & Render Properties...');
  const localAuth = await post('http://localhost:5001/api/auth/admin/login', {
    email: 'admin@acresbazaar.com',
    password: 'Admin@123'
  });
  const localToken = localAuth.data?.token;
  const localPropsRes = await get('http://localhost:5001/api/properties', { Authorization: 'Bearer ' + localToken });
  const renderPropsRes = await get('https://acresbazaar-backend.onrender.com/api/properties', authHeaders);

  const localProps = localPropsRes.data?.properties || [];
  const renderProps = renderPropsRes.data?.properties || [];
  console.log(`Local Properties: ${localProps.length} | Render Properties: ${renderProps.length}`);

  const renderTitles = new Set(renderProps.map(p => p.title.toLowerCase().trim()));
  const missing = localProps.filter(p => !renderTitles.has(p.title.toLowerCase().trim()));
  console.log(`Missing properties to sync: ${missing.length}`);

  for (const p of missing) {
    console.log(`Syncing: ${p.title} (${p.city || p.location || 'Unknown'})`);
    const createPayload = {
      title: p.title,
      category: p.category,
      location: p.location || p.city || 'Tamil Nadu',
      city: p.city || p.location || 'Salem',
      price: p.price || 5000000,
      priceDisplay: p.priceDisplay || '₹50 Lakhs',
      description: p.description || p.shortDescription || p.title,
      status: p.status || 'APPROVED',
      planType: p.planType || 'PLATINUM',
      sellerName: p.sellerName || p.seller?.name || 'Verified Owner',
      sellerPhone: p.sellerPhone || p.seller?.mobile || '+91 99001 88990',
      sellerEmail: p.sellerEmail || p.seller?.email || 'owner@acresbazaar.com',
      sellerRole: p.sellerRole || 'SELLER',
      categorySpecs: typeof p.categorySpecs === 'string' ? p.categorySpecs : JSON.stringify(p.specs || p.categorySpecs || {}),
      images: (p.galleryImages || p.images || []).map((img, idx) => ({
        imageUrl: typeof img === 'string' ? img : img.imageUrl || img.url,
        isPrimary: idx === 0,
        displayOrder: idx
      }))
    };

    const res = await post('https://acresbazaar-backend.onrender.com/api/properties', createPayload, authHeaders);
    if (res.status === 200 || res.status === 201) {
      console.log(`  ✔ Created: ${p.title}`);
    } else {
      console.log(`  ✗ Error creating ${p.title}:`, res.data);
    }
  }

  console.log('\n4. Final Verification...');
  const finalRenderPropsRes = await get('https://acresbazaar-backend.onrender.com/api/properties', authHeaders);
  const finalSettingsRes = await get('https://acresbazaar-backend.onrender.com/api/settings');

  console.log('Final Render properties count:', finalRenderPropsRes.data?.properties?.length || finalRenderPropsRes.data?.count);
  console.log('Final Render logo:', finalSettingsRes.data?.settings?.website_logo || finalSettingsRes.data?.settings?.logo_url);
}

sync();
