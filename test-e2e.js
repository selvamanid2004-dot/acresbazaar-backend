const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { ValidationPipe } = require('@nestjs/common');

async function runE2ETests() {
  console.log('====================================================');
  console.log('  AcresBazaar Comprehensive E2E Verification Suite   ');
  console.log('====================================================\n');

  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  await app.listen(5099);
  const baseUrl = 'http://127.0.0.1:5099/api';

  async function api(path, options = {}) {
    const url = `${baseUrl}${path}`;
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, data };
  }

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  const timestamp = Date.now();

  try {
    // 1. Common Registration: Buyer
    console.log('\n--- 1. Testing Common Registration for All 4 Roles ---');
    const buyerEmail = `test.buyer.${timestamp}@acresbazaar.com`;
    const regBuyer = await api('/auth/register', {
      method: 'POST',
      body: {
        name: 'Test Buyer',
        mobile: '9876543210',
        email: buyerEmail,
        password: 'Password@123',
        role: 'BUYER'
      }
    });
    assert(regBuyer.status === 201 || regBuyer.status === 200, `Buyer Registration (Status: ${regBuyer.status})`);
    assert(regBuyer.data?.user?.role === 'BUYER', 'Buyer role returned correctly');

    // 2. Common Registration: Seller
    const sellerEmail = `test.seller.${timestamp}@acresbazaar.com`;
    const regSeller = await api('/auth/register', {
      method: 'POST',
      body: {
        name: 'Test Seller',
        mobile: '9876543211',
        email: sellerEmail,
        password: 'Password@123',
        role: 'SELLER'
      }
    });
    assert(regSeller.status === 201 || regSeller.status === 200, `Seller Registration (Status: ${regSeller.status})`);
    assert(regSeller.data?.user?.role === 'SELLER', 'Seller role returned correctly');
    const sellerToken = regSeller.data?.token || regSeller.data?.access_token;
    const sellerId = regSeller.data?.user?.id;

    // 3. Common Registration: Dealer
    const dealerEmail = `test.dealer.${timestamp}@acresbazaar.com`;
    const regDealer = await api('/auth/register', {
      method: 'POST',
      body: {
        name: 'Test Dealer',
        mobile: '9876543212',
        email: dealerEmail,
        password: 'Password@123',
        role: 'DEALER'
      }
    });
    assert(regDealer.status === 201 || regDealer.status === 200, `Dealer Registration (Status: ${regDealer.status})`);
    assert(regDealer.data?.user?.role === 'DEALER', 'Dealer role returned correctly');
    const dealerToken = regDealer.data?.token || regDealer.data?.access_token;
    const dealerId = regDealer.data?.user?.id;

    // 4. Common Registration: Partner (COMMON_PEOPLE)
    const partnerEmail = `test.partner.${timestamp}@acresbazaar.com`;
    const regPartner = await api('/auth/register', {
      method: 'POST',
      body: {
        name: 'Test Partner',
        mobile: '9876543213',
        email: partnerEmail,
        password: 'Password@123',
        role: 'PARTNER'
      }
    });
    assert(regPartner.status === 201 || regPartner.status === 200, `Partner Registration (Status: ${regPartner.status})`);
    assert(regPartner.data?.user?.role === 'COMMON_PEOPLE' || regPartner.data?.user?.role === 'PARTNER', 'Partner mapped role verified');
    const partnerToken = regPartner.data?.token || regPartner.data?.access_token;

    // 5. Authentication / Login Verification
    console.log('\n--- 2. Testing Authentication & Session Tokens ---');
    const loginRes = await api('/auth/login', {
      method: 'POST',
      body: { email: sellerEmail, password: 'Password@123' }
    });
    assert((loginRes.status === 200 || loginRes.status === 201) && (loginRes.data?.token || loginRes.data?.access_token), 'Seller Login generates valid JWT token');

    // Admin Login (using default seed admin credentials)
    const adminLogin = await api('/auth/admin/login', {
      method: 'POST',
      body: { email: 'admin@acresbazaar.com', password: 'Admin@123' }
    });
    assert((adminLogin.status === 200 || adminLogin.status === 201) && (adminLogin.data?.token || adminLogin.data?.access_token), 'Admin Login successful');
    const adminToken = adminLogin.data?.token || adminLogin.data?.access_token;

    // 6. Property Submission Flow
    console.log('\n--- 3. Testing Property Submission & Ownership Controls ---');
    const propRes = await api('/properties', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sellerToken}` },
      body: {
        title: `Luxury Villa in Coimbatore ${timestamp}`,
        category: 'Villas',
        location: 'RS Puram, Coimbatore',
        city: 'Coimbatore',
        price: 8500000,
        description: 'Spectacular 3 BHK Villa with private garden',
        planType: 'GOLD',
        categorySpecs: JSON.stringify({ bhk: '3 BHK', facing: 'East' })
      }
    });
    assert(propRes.status === 201 || propRes.status === 200, `Seller creates property (Status: ${propRes.status})`);
    const propId = propRes.data?.id || propRes.data?.property?.id;
    assert(!!propId, `Property ID generated: ${propId}`);

    // Verify unapproved property is NOT visible on public website endpoint
    const pubListBefore = await api('/properties/public');
    const foundBefore = (pubListBefore.data?.properties || []).some(p => p.id === propId);
    assert(!foundBefore, 'Unapproved property is NOT published publicly (Approval Isolation)');

    // 7. Admin Moderation & Approval Flow
    console.log('\n--- 4. Testing Admin Moderation & Approval ---');
    const approveRes = await api(`/properties/${propId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'APPROVED', planType: 'PLATINUM' }
    });
    assert(approveRes.status === 200, `Admin approves property (Status: ${approveRes.status})`);

    // Verify approved property is now visible on public website endpoint
    const pubListAfter = await api('/properties/public');
    const foundAfter = (pubListAfter.data?.properties || []).some(p => p.id === propId);
    assert(foundAfter, 'Approved property is now live on public search endpoint');

    // 8. Dealer Property Booking Flow & Points Reward
    console.log('\n--- 5. Testing Booking Flow & Rewards ---');
    const bookRes = await api(`/properties/${propId}/book`, {
      method: 'POST',
      body: {
        bookerRole: 'DEALER',
        bookerId: dealerId,
        bookerName: 'Test Dealer',
        bookerEmail: dealerEmail,
        bookerPhone: '9876543212',
        dealerCompany: 'Prime Realty Estate Agency',
        planType: 'PLATINUM',
        bookingAmount: 10000
      }
    });
    assert(bookRes.status === 201 || bookRes.status === 200, `Dealer books property (Status: ${bookRes.status})`);

    // 9. Partner Wallet & Bank Details Security Verification
    console.log('\n--- 6. Testing Partner Wallet & Security Hardening ---');
    const walletRes = await api(`/rewards/partner-wallet?email=${encodeURIComponent(partnerEmail)}`, {
      headers: { Authorization: `Bearer ${partnerToken}` }
    });
    assert(walletRes.status === 200, `Partner can access own wallet (Status: ${walletRes.status})`);

    // Verify security: unauthenticated access to partner wallet should be 401
    const unauthWallet = await api(`/rewards/partner-wallet?email=${encodeURIComponent(partnerEmail)}`);
    assert(unauthWallet.status === 401, 'Unauthenticated access to partner wallet is blocked (401 Unauthorized)');

    // Verify security: Customers list is protected from exposing passwordHash
    const custRes = await api('/customers', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const hasHash = (custRes.data?.customers || []).some(c => c.passwordHash !== undefined);
    assert(!hasHash, 'Password hashes are sanitized from customer responses');

  } catch (err) {
    console.error('Fatal Test Execution Error:', err);
    failed++;
  } finally {
    await app.close();
    console.log('\n====================================================');
    console.log(`  E2E Test Results: ${passed} PASSED, ${failed} FAILED  `);
    console.log('====================================================\n');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runE2ETests();
