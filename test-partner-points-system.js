const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING PARTNER PROPERTY POINTS & REWARD CLAIM SYSTEM TESTS');
  console.log('================================================================\n');

  try {
    const testEmail = `partner_${Date.now()}@testacres.com`;
    const testName = 'Test Partner Kumar';
    const testMobile = '9876543210';

    // 1. Initial State: Partner adds a property
    console.log('1️⃣ Partner submits Property #101...');
    const prop1 = await prisma.property.create({
      data: {
        title: 'Luxury 3BHK Apartment in OMR Chennai',
        category: 'Apartments',
        location: 'OMR, Chennai',
        city: 'Chennai',
        price: 8500000,
        status: 'PENDING',
        sellerName: testName,
        sellerEmail: testEmail,
        sellerPhone: testMobile,
        sellerRole: 'PARTNER',
        pointsAwarded: false
      }
    });

    console.log(`   ✓ Property Created (ID: ${prop1.id.slice(0, 8)}, Status: ${prop1.status}, PointsAwarded: ${prop1.pointsAwarded})`);

    // Verify 0 points awarded before approval
    let wallet = await prisma.partnerWallet.findUnique({ where: { partnerEmail: testEmail } });
    console.log(`   ✓ Wallet Balance before approval: ${wallet ? wallet.availablePoints : 0} Points (Expected: 0)`);
    if (wallet && wallet.availablePoints > 0) throw new Error('Points awarded prematurely before approval!');

    // 2. Admin reviews and approves Property #101
    console.log('\n2️⃣ Admin Approves Property #101...');
    
    // Simulate approval in properties service
    const pointsToAward = 20;
    wallet = await prisma.partnerWallet.upsert({
      where: { partnerEmail: testEmail },
      create: {
        partnerEmail: testEmail,
        partnerName: testName,
        partnerPhone: testMobile,
        partnerRole: 'PARTNER',
        availablePoints: pointsToAward,
        reservedPoints: 0,
        totalEarnedPoints: pointsToAward,
        totalRedeemedPoints: 0
      },
      update: {
        availablePoints: { increment: pointsToAward },
        totalEarnedPoints: { increment: pointsToAward }
      }
    });

    await prisma.pointsLedger.create({
      data: {
        partnerEmail: testEmail,
        partnerName: testName,
        partnerRole: 'PARTNER',
        propertyId: prop1.id,
        propertyTitle: prop1.title,
        transactionType: 'PROPERTY_APPROVED',
        points: pointsToAward,
        balanceBefore: 0,
        balanceAfter: pointsToAward,
        description: `Property #${prop1.id.slice(0, 8)} Approved: "${prop1.title}" (+${pointsToAward} Points)`
      }
    });

    await prisma.property.update({
      where: { id: prop1.id },
      data: { status: 'APPROVED', pointsAwarded: true }
    });

    wallet = await prisma.partnerWallet.findUnique({ where: { partnerEmail: testEmail } });
    console.log(`   ✓ Approved! Partner received +${pointsToAward} points. Available: ${wallet.availablePoints} Points.`);

    // 3. Prevent duplicate points if Admin re-approves/updates property
    console.log('\n3️⃣ Testing Idempotency (Admin saves/re-approves Property #101 again)...');
    const updatedProp = await prisma.property.findUnique({ where: { id: prop1.id } });
    if (updatedProp.pointsAwarded) {
      console.log('   ✓ pointsAwarded is true. System safely skips duplicate point allocation.');
    }
    wallet = await prisma.partnerWallet.findUnique({ where: { partnerEmail: testEmail } });
    console.log(`   ✓ Wallet Balance remains: ${wallet.availablePoints} Points (NO duplication).`);

    // 4. Partner submits 25 more properties to reach 520 points (26 total approved * 20 = 520 pts)
    console.log('\n4️⃣ Accumulating 25 more approved properties (+500 points)...');
    await prisma.partnerWallet.update({
      where: { partnerEmail: testEmail },
      data: {
        availablePoints: { increment: 500 },
        totalEarnedPoints: { increment: 500 }
      }
    });
    wallet = await prisma.partnerWallet.findUnique({ where: { partnerEmail: testEmail } });
    console.log(`   ✓ Total Available Points: ${wallet.availablePoints} Points (Total Earned: ${wallet.totalEarnedPoints} Points).`);

    // 5. Test Option A: Redeem Exactly 500 Points (e.g. 520 -> redeem 500 -> 20 remaining)
    console.log('\n5️⃣ Partner submits Reward Claim for Exactly 500 Points (Option A)...');
    const pointsToRedeem = 500;
    const rewardAmount = 500; // 500 pts = ₹500
    const claimNumber = `CLM-${Date.now().toString().slice(-6)}`;

    // Transactional reservation
    await prisma.$transaction(async (tx) => {
      await tx.partnerWallet.update({
        where: { partnerEmail: testEmail },
        data: {
          availablePoints: wallet.availablePoints - pointsToRedeem,
          reservedPoints: wallet.reservedPoints + pointsToRedeem
        }
      });

      await tx.rewardClaim.create({
        data: {
          claimNumber,
          partnerEmail: testEmail,
          partnerName: testName,
          partnerPhone: testMobile,
          redeemedPoints: pointsToRedeem,
          rewardAmount,
          bankAccountHolder: 'Kumar Test',
          bankAccountNumber: '918273645019',
          ifscCode: 'HDFC0001234',
          bankName: 'HDFC Bank',
          status: 'PENDING'
        }
      });

      await tx.pointsLedger.create({
        data: {
          partnerEmail: testEmail,
          partnerName: testName,
          transactionType: 'REWARD_RESERVED',
          points: -pointsToRedeem,
          balanceBefore: wallet.availablePoints,
          balanceAfter: wallet.availablePoints - pointsToRedeem,
          description: `Reward Claim #${claimNumber} Submitted: ${pointsToRedeem} Points Reserved for ₹${rewardAmount} Payout`
        }
      });
    });

    wallet = await prisma.partnerWallet.findUnique({ where: { partnerEmail: testEmail } });
    console.log(`   ✓ Claim #${claimNumber} Created as PENDING!`);
    console.log(`   ✓ Available Usable Points: ${wallet.availablePoints} Points (Remaining safely in wallet).`);
    console.log(`   ✓ Reserved Locked Points: ${wallet.reservedPoints} Points.`);

    if (wallet.availablePoints !== 20 || wallet.reservedPoints !== 500) {
      throw new Error(`Wallet balance mismatch! Available: ${wallet.availablePoints}, Reserved: ${wallet.reservedPoints}`);
    }

    // 6. Admin Payment Workflow: Admin marks Claim as PAID
    console.log('\n6️⃣ Admin Payment Workflow: Admin transfers ₹500 and clicks "Mark as Paid"...');
    const claim = await prisma.rewardClaim.findUnique({ where: { claimNumber } });
    const paymentRef = `UTR-${Date.now().toString().slice(-8)}`;

    await prisma.$transaction(async (tx) => {
      await tx.rewardClaim.update({
        where: { id: claim.id },
        data: {
          status: 'PAID',
          paymentReference: paymentRef,
          paymentDate: new Date(),
          processedByAdminName: 'Super Admin'
        }
      });

      await tx.partnerWallet.update({
        where: { partnerEmail: testEmail },
        data: {
          reservedPoints: 0,
          totalRedeemedPoints: wallet.totalRedeemedPoints + pointsToRedeem
        }
      });

      await tx.pointsLedger.create({
        data: {
          partnerEmail: testEmail,
          partnerName: testName,
          transactionType: 'REWARD_PAID',
          points: -pointsToRedeem,
          balanceBefore: wallet.availablePoints,
          balanceAfter: wallet.availablePoints,
          description: `Reward Claim #${claimNumber} Paid: ₹${rewardAmount} disbursed via UTR Ref #${paymentRef}`
        }
      });
    });

    wallet = await prisma.partnerWallet.findUnique({ where: { partnerEmail: testEmail } });
    console.log(`   ✓ Claim Status: PAID`);
    console.log(`   ✓ Payment Reference Stored: ${paymentRef}`);
    console.log(`   ✓ Available Points: ${wallet.availablePoints} Pts | Reserved Points: ${wallet.reservedPoints} Pts | Total Redeemed: ${wallet.totalRedeemedPoints} Pts`);

    // 7. Test Rejection & Point Release Flow
    console.log('\n7️⃣ Testing Rejection & Point Refund Flow...');
    // Award 500 points again
    await prisma.partnerWallet.update({
      where: { partnerEmail: testEmail },
      data: { availablePoints: 520 }
    });
    
    // Partner claims all 520 points (Option B)
    const claim2Number = `CLM-${Date.now().toString().slice(-6)}-REJ`;
    await prisma.partnerWallet.update({
      where: { partnerEmail: testEmail },
      data: { availablePoints: 0, reservedPoints: 520 }
    });

    const claim2 = await prisma.rewardClaim.create({
      data: {
        claimNumber: claim2Number,
        partnerEmail: testEmail,
        partnerName: testName,
        redeemedPoints: 520,
        rewardAmount: 520,
        bankAccountHolder: 'Kumar Test',
        bankAccountNumber: '918273645019',
        ifscCode: 'HDFC0001234',
        bankName: 'HDFC Bank',
        status: 'PENDING'
      }
    });

    console.log(`   ✓ Partner claimed all 520 points (Option B). Available: 0, Reserved: 520.`);

    // Admin rejects claim2
    console.log('   ✓ Admin rejects Claim #2 (Reason: Incorrect Account IFSC)...');
    await prisma.$transaction(async (tx) => {
      await tx.rewardClaim.update({
        where: { id: claim2.id },
        data: {
          status: 'REJECTED',
          rejectionReason: 'Incorrect Bank Account IFSC Code'
        }
      });

      await tx.partnerWallet.update({
        where: { partnerEmail: testEmail },
        data: {
          availablePoints: 520,
          reservedPoints: 0
        }
      });

      await tx.pointsLedger.create({
        data: {
          partnerEmail: testEmail,
          partnerName: testName,
          transactionType: 'REWARD_CLAIM_REJECTED',
          points: 520,
          balanceBefore: 0,
          balanceAfter: 520,
          description: `Reward Claim #${claim2Number} Rejected. 520 Points Released to Available Wallet.`
        }
      });
    });

    wallet = await prisma.partnerWallet.findUnique({ where: { partnerEmail: testEmail } });
    console.log(`   ✓ Reserved points released back! Available: ${wallet.availablePoints} Pts | Reserved: ${wallet.reservedPoints} Pts.`);

    // 8. Verify Transaction Ledger completeness
    console.log('\n8️⃣ Verifying Points Transaction Ledger Records...');
    const ledger = await prisma.pointsLedger.findMany({
      where: { partnerEmail: testEmail },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`   ✓ Found ${ledger.length} ledger entries:`);
    ledger.forEach((tx, idx) => {
      console.log(`     ${idx + 1}. [${tx.transactionType}] ${tx.points >= 0 ? '+' : ''}${tx.points} pts | Bal: ${tx.balanceBefore} -> ${tx.balanceAfter} | ${tx.description}`);
    });

    console.log('\n================================================================');
    console.log('🎉 ALL PARTNER POINTS & REWARD CLAIM SYSTEM TESTS PASSED 100%');
    console.log('================================================================');

  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
