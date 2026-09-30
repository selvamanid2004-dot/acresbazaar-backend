const http = require('http');

const API_BASE = 'http://localhost:5001/api';

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'object' ? JSON.stringify(options.body) : options.body);
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING SNAP PROPERTIES & ALL PROPERTIES INTEGRATION TESTS ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ ${message}`);
      failed++;
    }
  }

  try {
    // 1. Login as Super Admin to obtain JWT token
    console.log('1. Authenticating as Super Admin...');
    const loginRes = await request(`${API_BASE}/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { email: 'admin@acresbazaar.com', password: 'Admin@123' }
    });
    assert(loginRes.status === 201 && loginRes.body.token, 'Super Admin login successful');
    const token = loginRes.body.token;
    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // 2. Create Partner / Common People user
    console.log('\n2. Creating / Registering a Partner (Common People) user...');
    const partnerEmail = `partner_${Date.now()}@example.com`;
    const partnerReg = await request(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        name: 'Test Partner Kumar',
        email: partnerEmail,
        mobile: '9840199999',
        password: 'partnerpassword123',
        role: 'COMMON_PEOPLE'
      }
    });
    assert(partnerReg.status === 201, 'Partner user registered with role COMMON_PEOPLE');
    const partnerId = partnerReg.body.user?.id;

    // 3. Create a Seller user
    console.log('\n3. Creating a Seller user...');
    const sellerEmail = `seller_${Date.now()}@example.com`;
    const sellerReg = await request(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        name: 'Test Seller Ramesh',
        email: sellerEmail,
        mobile: '9840188888',
        password: 'sellerpassword123',
        role: 'SELLER'
      }
    });
    assert(sellerReg.status === 201, 'Seller user registered with role SELLER');
    const sellerUserId = sellerReg.body.user?.id;

    // 4. Partner posts Property A (Snap Property)
    console.log('\n4. Partner posts Property A (Snap Property)...');
    const snapPropertyPayload = {
      title: 'Partner Spot TO-LET Villa in Anna Nagar',
      category: 'Residential',
      location: '2nd Avenue, Anna Nagar',
      city: 'Chennai',
      price: 45000,
      priceDisplay: '₹45,000 / month',
      description: 'TO-LET board spotted near Roundtana. Contact: 9840155555',
      sellerId: partnerId,
      sellerName: 'Test Partner Kumar',
      sellerEmail: partnerEmail,
      sellerPhone: '9840199999',
      sellerRole: 'COMMON_PEOPLE',
      categorySpecs: {
        isSnapProperty: true,
        boardType: 'TO-LET / RENT',
        boardContact: '9840155555'
      },
      status: 'PENDING'
    };
    const snapCreateRes = await request(`${API_BASE}/properties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: snapPropertyPayload
    });
    assert(snapCreateRes.status === 201 && snapCreateRes.body.property?.id, 'Property A created with status PENDING');
    const propertyA = snapCreateRes.body.property;
    const propertyAId = propertyA.id;

    // 5. Seller posts Property B (Regular Seller Property)
    console.log('\n5. Seller posts Property B (Regular Seller Property)...');
    const sellerPropertyPayload = {
      title: 'Seller Independent House in Adyar',
      category: 'Residential',
      location: 'Gandhi Nagar, Adyar',
      city: 'Chennai',
      price: 25000000,
      priceDisplay: '₹2.50 Cr',
      description: 'Direct owner luxury 3 BHK house.',
      sellerId: sellerUserId,
      sellerName: 'Test Seller Ramesh',
      sellerEmail: sellerEmail,
      sellerPhone: '9840188888',
      sellerRole: 'SELLER',
      status: 'PENDING'
    };
    const sellerCreateRes = await request(`${API_BASE}/properties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: sellerPropertyPayload
    });
    assert(sellerCreateRes.status === 201 && sellerCreateRes.body.property?.id, 'Property B created with status PENDING');
    const propertyB = sellerCreateRes.body.property;
    const propertyBId = propertyB.id;

    // 6. Approve Property A and Property B
    console.log('\n6. Approving Property A (Snap) and Property B (Seller)...');
    const approveARes = await request(`${API_BASE}/properties/${propertyAId}/status`, {
      method: 'PATCH',
      headers: authHeaders,
      body: { status: 'APPROVED', planType: 'GOLD' }
    });
    assert(approveARes.status === 200, 'Property A approved with GOLD tier');

    const approveBRes = await request(`${API_BASE}/properties/${propertyBId}/status`, {
      method: 'PATCH',
      headers: authHeaders,
      body: { status: 'APPROVED', planType: 'PLATINUM' }
    });
    assert(approveBRes.status === 200, 'Property B approved with PLATINUM tier');

    // 7. Verify Snap Properties API (isSnap=true)
    console.log('\n7. Verifying Snap Properties API (/properties/admin/all?isSnap=true)...');
    const snapListRes = await request(`${API_BASE}/properties/admin/all?isSnap=true`, {
      method: 'GET',
      headers: authHeaders
    });
    assert(snapListRes.status === 200, 'Snap properties fetched successfully');
    const snapList = snapListRes.body.properties || [];
    
    // Check Property A is present in Snap Properties
    const propAInSnap = snapList.find(p => p.id === propertyAId);
    assert(!!propAInSnap, `Property A (${propertyAId}) IS PRESENT in Snap Properties`);

    // Check Property B (Seller) is NOT present in Snap Properties
    const propBInSnap = snapList.find(p => p.id === propertyBId);
    assert(!propBInSnap, `Property B (${propertyBId}, Seller) is NOT in Snap Properties (Requirement 2 Verified)`);

    // Check all properties in Snap Properties belong ONLY to Partners / Common People
    const nonPartnerInSnap = snapList.filter(p => {
      const role = p.seller?.role || p.sellerRole;
      return role !== 'COMMON_PEOPLE' && role !== 'PARTNER';
    });
    assert(nonPartnerInSnap.length === 0, `All ${snapList.length} items in Snap Properties are from Partners/Common People (0 non-partner items)`);

    // 8. Verify All Properties API (/properties/admin/all)
    console.log('\n8. Verifying All Properties API (/properties/admin/all)...');
    const allPropsRes = await request(`${API_BASE}/properties/admin/all`, {
      method: 'GET',
      headers: authHeaders
    });
    assert(allPropsRes.status === 200, 'All properties fetched successfully');
    const allList = allPropsRes.body.properties || [];

    // Check Property A is present in All Properties
    const propAInAll = allList.find(p => p.id === propertyAId);
    assert(!!propAInAll, `Property A (${propertyAId}) IS PRESENT in All Properties (Snap Properties ⊂ All Properties)`);

    // Check Property B is present in All Properties
    const propBInAll = allList.find(p => p.id === propertyBId);
    assert(!!propBInAll, `Property B (${propertyBId}) IS PRESENT in All Properties`);

    // Check no duplicate IDs in All Properties
    const propAOccurrences = allList.filter(p => p.id === propertyAId).length;
    assert(propAOccurrences === 1, `Property A appears exactly once in All Properties (Occurrences: ${propAOccurrences})`);

    // 9. Verify Public Properties API (/properties/public)
    console.log('\n9. Verifying Public Website Properties API (/properties/public)...');
    const publicRes = await request(`${API_BASE}/properties/public`);
    assert(publicRes.status === 200, 'Public properties fetched successfully');
    const publicList = publicRes.body.properties || [];

    const propAInPublic = publicList.find(p => p.id === propertyAId);
    assert(!!propAInPublic, `Property A IS PRESENT on the Public Website (Status: APPROVED)`);

    const propBInPublic = publicList.find(p => p.id === propertyBId);
    assert(!!propBInPublic, `Property B IS PRESENT on the Public Website (Status: APPROVED)`);

    // 10. Clean up test records
    console.log('\n10. Cleaning up test properties...');
    await request(`${API_BASE}/properties/${propertyAId}`, { method: 'DELETE', headers: authHeaders });
    await request(`${API_BASE}/properties/${propertyBId}`, { method: 'DELETE', headers: authHeaders });
    console.log('Test properties cleaned up.');

    console.log(`\n========================================`);
    console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================\n`);

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
