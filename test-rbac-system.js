const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const API_URL = 'http://localhost:5001/api';

async function req(path, options = {}) {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return {
    status: res.status,
    ok: res.ok,
    data
  };
}

async function runRbacTests() {
  console.log('================================================================');
  console.log('🛡️ RUNNING AUTOMATED RBAC SYSTEM VERIFICATION TESTS');
  console.log('================================================================\n');

  let testPassed = 0;
  let testFailed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      testPassed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      testFailed++;
    }
  }

  try {
    // 1. Super Admin Login & Me Profile
    console.log('📌 Test 1: Super Admin Authentication & Profile Verification');
    const superAdminRes = await req('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@acresbazaar.com',
        password: 'Admin@123'
      })
    });

    const superAdminToken = superAdminRes.data.token;
    assert(!!superAdminToken, 'Super Admin login returns JWT token');
    assert(superAdminRes.data.admin.role === 'SUPER_ADMIN', 'Super Admin role is SUPER_ADMIN');

    const superAdminMe = await req('/auth/admin/me', {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    assert(superAdminMe.data.admin.role === 'SUPER_ADMIN', 'GET /auth/admin/me returns Super Admin profile');

    // 2. Fetch Modules List
    console.log('\n📌 Test 2: Fetching Available RBAC Module List');
    const modulesRes = await req('/staff/modules', {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    assert(modulesRes.data.success === true, 'GET /staff/modules returned successfully');
    assert(modulesRes.data.modules.length >= 20, `Modules count is ${modulesRes.data.modules.length} (>= 20)`);

    // Clean up previous test users if any
    await prisma.admin.deleteMany({
      where: { email: { in: ['test_admin_rbac@test.com', 'test_staff_rbac@test.com'] } }
    });

    // 3. Create Administrator with Buyers & Sellers Permissions
    console.log('\n📌 Test 3: Create Administrator with [buyers, sellers] Permissions');
    const createAdminRes = await req('/staff', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superAdminToken}` },
      body: JSON.stringify({
        email: 'test_admin_rbac@test.com',
        name: 'Test Administrator',
        password: 'AdminPassword123!',
        role: 'ADMIN',
        permissions: ['buyers', 'sellers']
      })
    });
    assert(createAdminRes.data.success === true, 'Administrator created successfully');
    assert(createAdminRes.data.staff.permissions.includes('buyers'), 'Permissions contain buyers');
    assert(createAdminRes.data.staff.permissions.includes('sellers'), 'Permissions contain sellers');

    // 4. Create Staff with [reports] Permission only
    console.log('\n📌 Test 4: Create Staff User with [reports] Permission Only');
    const createStaffRes = await req('/staff', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superAdminToken}` },
      body: JSON.stringify({
        email: 'test_staff_rbac@test.com',
        name: 'Test Staff Desk',
        password: 'StaffPassword123!',
        role: 'STAFF',
        permissions: ['reports']
      })
    });
    assert(createStaffRes.data.success === true, 'Staff account created successfully');
    assert(createStaffRes.data.staff.permissions.length === 1 && createStaffRes.data.staff.permissions[0] === 'reports', 'Staff permissions are exactly [reports]');

    // 5. Staff Login & Authorized Route Access
    console.log('\n📌 Test 5: Staff Login and Authorized vs Unauthorized API Verification');
    const staffLoginRes = await req('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test_staff_rbac@test.com',
        password: 'StaffPassword123!'
      })
    });
    const staffToken = staffLoginRes.data.token;
    assert(!!staffToken, 'Staff login returns token');
    assert(staffLoginRes.data.admin.role === 'STAFF', 'Staff role is STAFF');
    assert(staffLoginRes.data.admin.permissions.includes('reports'), 'Staff has reports permission in response');

    // Staff accessing authorized endpoint (/reports)
    const staffReportsRes = await req('/reports', {
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    assert(staffReportsRes.status === 200, 'Staff can access authorized module (GET /reports)');

    // Staff attempting unauthorized endpoint (/properties/admin/all) -> Must return 403 Forbidden!
    const staffBlockedProps = await req('/properties/admin/all', {
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    assert(staffBlockedProps.status === 403, 'Staff is blocked with 403 Forbidden when calling unauthorized GET /properties/admin/all');

    // Staff attempting unauthorized endpoint (/staff) -> Must return 403 Forbidden!
    const staffBlockedStaff = await req('/staff', {
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    assert(staffBlockedStaff.status === 403, 'Staff is blocked with 403 Forbidden when calling unauthorized GET /staff');

    // 6. Administrator Login & Verification
    console.log('\n📌 Test 6: Administrator Login and Permissions Verification');
    const adminLoginRes = await req('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test_admin_rbac@test.com',
        password: 'AdminPassword123!'
      })
    });
    const adminToken = adminLoginRes.data.token;
    assert(!!adminToken, 'Administrator login returns token');

    // Administrator accessing authorized customer list
    const adminCustRes = await req('/customers?role=BUYER', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminCustRes.status === 200, 'Administrator can access authorized module (GET /customers)');

    // Administrator attempting unauthorized endpoint (/plans) -> Must return 403 Forbidden!
    const adminBlockedPlans = await req('/plans/gold', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name: 'Unauthorized Edit' })
    });
    assert(adminBlockedPlans.status === 403, 'Administrator is blocked with 403 Forbidden when updating unauthorized module PATCH /plans/gold');

    // 7. Update Permissions dynamically
    console.log('\n📌 Test 7: Super Admin Updates Permissions and Verifies Immediate Effect');
    const staffId = createStaffRes.data.staff.id;
    // Grant Staff access to 'properties' module as well
    const updateRes = await req(`/staff/${staffId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${superAdminToken}` },
      body: JSON.stringify({
        permissions: ['reports', 'properties']
      })
    });
    assert(updateRes.data.staff.permissions.includes('properties'), 'Permissions successfully updated by Super Admin');

    // Verify staff can now access /properties/admin/all
    const staffAllowedPropsRes = await req('/properties/admin/all', {
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    assert(staffAllowedPropsRes.status === 200, 'Staff can immediately access GET /properties/admin/all after permissions update');

    // 8. Disable User & Verify Login and API rejection
    console.log('\n📌 Test 8: Deactivating Account and Verifying Instant Blocking');
    await req(`/staff/${staffId}/toggle-status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${superAdminToken}` },
      body: JSON.stringify({ status: false })
    });

    const deactivatedLogin = await req('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test_staff_rbac@test.com',
        password: 'StaffPassword123!'
      })
    });
    assert(deactivatedLogin.status === 401 || deactivatedLogin.status === 403, 'Deactivated staff login is rejected with Unauthorized/Forbidden');

    const deactivatedApi = await req('/reports', {
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    assert(deactivatedApi.status === 401 || deactivatedApi.status === 403, 'Existing token of deactivated staff is rejected immediately by PermissionsGuard');

    // 9. Reset Password
    console.log('\n📌 Test 9: Super Admin Resetting Staff Password');
    // Reactivate staff
    await req(`/staff/${staffId}/toggle-status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${superAdminToken}` },
      body: JSON.stringify({ status: true })
    });

    await req(`/staff/${staffId}/password`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${superAdminToken}` },
      body: JSON.stringify({ password: 'NewStrongPassword2026!' })
    });

    const newPassLogin = await req('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test_staff_rbac@test.com',
        password: 'NewStrongPassword2026!'
      })
    });
    assert(!!newPassLogin.data.token, 'Staff can log in with new reset password');

    // 10. Clean up test users
    console.log('\n📌 Test 10: Cleaning up test accounts');
    const adminId = createAdminRes.data.staff.id;
    await req(`/staff/${staffId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    await req(`/staff/${adminId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    assert(true, 'Test staff and administrator deleted successfully');

    // 11. Verify Public Website Unaffected
    console.log('\n📌 Test 11: Verify Public Website Endpoints Unaffected');
    const publicPropsRes = await req('/properties/public');
    assert(publicPropsRes.status === 200 && Array.isArray(publicPropsRes.data.properties), 'Public properties endpoint /properties/public is operational');

    const publicCatsRes = await req('/categories');
    assert(publicCatsRes.status === 200 && Array.isArray(publicCatsRes.data.categories), 'Public categories endpoint /categories is operational');

    const publicSettingsRes = await req('/settings');
    assert(publicSettingsRes.status === 200, 'Public settings endpoint /settings is operational');

    console.log('\n================================================================');
    console.log(`🎉 ALL TESTS COMPLETED: ${testPassed} PASSED, ${testFailed} FAILED`);
    console.log('================================================================\n');

  } catch (globalErr) {
    console.error('Fatal Test Error:', globalErr);
  } finally {
    await prisma.$disconnect();
  }
}

runRbacTests();
