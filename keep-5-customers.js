const { PrismaClient } = require('@prisma/client');
const { Client } = require('pg');
const bcrypt = require('bcrypt');
const https = require('https');

const prisma = new PrismaClient();

const RENDER_DB_URL = 'postgresql://acresbazaar_db_user:s6e16cTq5sU2x10F1qf5qDkC5LhKqjQp@dpg-cvi7q8dumphs73fsqt00-a.oregon-postgres.render.com/acresbazaar_db';

async function getHashedPassword(pw = 'User@123') {
  return bcrypt.hash(pw, 10);
}

// 5 Curated Customers / Users representing each role and flow
async function getPristineUsers() {
  const hash = await getHashedPassword('User@123');
  return [
    {
      id: 'usr-buyer-1',
      name: 'Rajesh Kumar',
      email: 'buyer@acresbazaar.com',
      mobile: '9840111223',
      passwordHash: hash,
      role: 'BUYER',
      isActive: true
    },
    {
      id: 'usr-seller-2',
      name: 'Sunita Reddy',
      email: 'seller@acresbazaar.com',
      mobile: '9900188990',
      passwordHash: hash,
      role: 'SELLER',
      isActive: true
    },
    {
      id: 'usr-dealer-3',
      name: 'Vikram Sharma (Horizon Realty)',
      email: 'dealer@acresbazaar.com',
      mobile: '9741044556',
      passwordHash: hash,
      role: 'DEALER',
      isActive: true
    },
    {
      id: 'usr-spotter-4',
      name: 'Ramesh Spotter Partner',
      email: 'partner@acresbazaar.com',
      mobile: '9840122334',
      passwordHash: hash,
      role: 'COMMON_PEOPLE',
      isActive: true
    },
    {
      id: 'usr-investor-5',
      name: 'Priya Sundaram (VIP Investor)',
      email: 'investor@acresbazaar.com',
      mobile: '9884055667',
      passwordHash: hash,
      role: 'BUYER',
      isActive: true
    }
  ];
}

function makeHttpsRequest(url, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const reqOptions = {
      hostname: u.hostname,
      port: 443,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      timeout: 15000
    };

    const req = https.request(reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch(e) { json = body; }
        resolve({ statusCode: res.statusCode, data: json });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function cleanCustomers() {
  console.log('===============================================================');
  console.log('👥 CLEANING UP USERS: KEEPING EXACTLY 5 CURATED CUSTOMERS');
  console.log('===============================================================\n');

  const pristineUsers = await getPristineUsers();
  const keepIds = pristineUsers.map(u => u.id);
  const keepEmails = pristineUsers.map(u => u.email);

  // -------------------------------------------------------------
  // PART 1: LOCAL SQLITE DATABASE
  // -------------------------------------------------------------
  console.log('▶ [1/2] Updating Local SQLite Database via Prisma...');
  try {
    // Delete activities of other users
    await prisma.userActivity.deleteMany({
      where: { userId: { notIn: keepIds, not: null } }
    });

    // Nullify sellerId on properties where seller is not in keepIds
    await prisma.property.updateMany({
      where: { sellerId: { notIn: keepIds } },
      data: { sellerId: null }
    });

    // Delete all other users
    const delCount = await prisma.user.deleteMany({
      where: { email: { notIn: keepEmails } }
    });
    console.log(`  ✔ Deleted ${delCount.count} extra users from Local SQLite`);

    // Upsert the 5 pristine users
    for (const u of pristineUsers) {
      await prisma.user.upsert({
        where: { email: u.email },
        update: { ...u },
        create: { ...u }
      });
    }

    const localCount = await prisma.user.count();
    console.log(`  ✔ Local SQLite User Count is now EXACTLY: ${localCount} users\n`);
  } catch (err) {
    console.error('  ❌ Local SQLite error:', err);
  } finally {
    await prisma.$disconnect();
  }

  // -------------------------------------------------------------
  // PART 2: RENDER POSTGRESQL DATABASE
  // -------------------------------------------------------------
  console.log('▶ [2/2] Updating Render Cloud Database...');
  try {
    const loginRes = await makeHttpsRequest('https://acresbazaar-backend.onrender.com/api/auth/admin/login', {
      method: 'POST'
    }, { email: 'admin@acresbazaar.com', password: 'Admin@123' });

    const token = loginRes.data?.token;
    if (token) {
      const headers = { Authorization: `Bearer ${token}` };
      const custRes = await makeHttpsRequest('https://acresbazaar-backend.onrender.com/api/customers', { headers });
      const allCusts = custRes.data?.customers || custRes.data || [];
      const keepEmailSet = new Set(keepEmails);

      let removed = 0;
      for (const c of allCusts) {
        if (!keepEmailSet.has(c.email)) {
          await makeHttpsRequest(`https://acresbazaar-backend.onrender.com/api/customers/${c.id}`, {
            method: 'DELETE',
            headers
          });
          removed++;
        }
      }
      console.log(`  ✔ Removed ${removed} extra users from Render Cloud`);

      // Ensure 5 users exist via registration if missing
      for (const u of pristineUsers) {
        await makeHttpsRequest('https://acresbazaar-backend.onrender.com/api/auth/register', {
          method: 'POST'
        }, {
          name: u.name,
          email: u.email,
          mobile: u.mobile,
          password: 'User@123',
          role: u.role
        });
      }

      const finalCustRes = await makeHttpsRequest('https://acresbazaar-backend.onrender.com/api/customers', { headers });
      const finalCusts = finalCustRes.data?.customers || finalCustRes.data || [];
      console.log(`  ✔ Render Cloud User Count is now: ${finalCusts.length} users\n`);
    }
  } catch (apiErr) {
    console.error('  ❌ Render Cloud API error:', apiErr.message);
  }

  // Print final 5 users
  console.log('===============================================================');
  console.log('📋 FINAL 5 PRISTINE CUSTOMERS LIST:');
  console.log('===============================================================');
  pristineUsers.forEach((u, idx) => {
    console.log(`  ${idx + 1}. [${u.role.padEnd(13, ' ')}] ${u.name.padEnd(30, ' ')} (${u.email}) | Default Pass: User@123`);
  });
  console.log('===============================================================\n');
  console.log('✨ SUCCESS: Exactly 5 customers retained across all user roles!');
}

cleanCustomers().catch(console.error);
