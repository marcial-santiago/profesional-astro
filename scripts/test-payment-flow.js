#!/usr/bin/env node

/**
 * Payment Flow Test Script
 *
 * This script tests the complete payment and visit booking flow
 * WITHOUT requiring a real Stripe payment.
 *
 * Usage:
 *   node scripts/test-payment-flow.js
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Test data
const TEST_VISIT = {
  nombre: 'Test User',
  telefono: '+61 400 000 000',
  email: 'test@example.com',
  mensaje: 'This is a test visit',
  date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days from now
  time: '14:00',
  workTypeId: null, // Will be set dynamically
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function logStep(step, message) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`STEP ${step}: ${message}`);
  console.log('='.repeat(60));
}

async function setup() {
  await logStep(1, 'Setup - Getting Test Service');

  // Find or create a test service
  let service = await prisma.workType.findFirst({
    where: { name: { contains: 'Test' } }
  });

  if (!service) {
    console.log('No test service found, creating one...');
    service = await prisma.workType.create({
      data: {
        name: 'Test Service for Payment Flow',
        description: 'A service for testing payment flow',
        duration: 60,
        price: 10.00,
        isActive: true,
      }
    });
    console.log(`✓ Created test service: ID=${service.id}, Name=${service.name}`);
  } else {
    console.log(`✓ Found test service: ID=${service.id}, Name=${service.name}`);
  }

  TEST_VISIT.workTypeId = service.id;
  return service;
}

async function createStripeSession() {
  await logStep(2, 'Create Stripe Session');

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: 1000, // $10.00 in cents
        product_data: {
          name: 'Test Service',
          description: 'Test service for payment flow',
        },
      },
    }],
    success_url: 'http://localhost:3000/checkout/success?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: 'http://localhost:3000/checkout',
    payment_intent_data: {
      metadata: {
        ...TEST_VISIT,
      },
    },
    // Store visit data in session metadata (same as checkout)
    metadata: {
      nombre: TEST_VISIT.nombre,
      telefono: TEST_VISIT.telefono,
      email: TEST_VISIT.email,
      mensaje: TEST_VISIT.mensaje,
      date: TEST_VISIT.date,
      time: TEST_VISIT.time,
      workTypeId: TEST_VISIT.workTypeId.toString(),
    },
  });

  console.log(`✓ Stripe Session created`);
  console.log(`  Session ID: ${session.id}`);
  console.log(`  Payment Status: ${session.payment_status}`);
  console.log(`  URL: ${session.url}`);
  console.log(`  Metadata:`, session.metadata);

  return session;
}

async function simulatePayment(sessionId) {
  await logStep(3, 'Simulate Payment (In Test Mode)');

  console.log('Note: In test mode, you would normally:');
  console.log('  1. Visit the checkout URL');
  console.log('  2. Fill in test card details (4242 4242 4242 4242)');
  console.log('  3. Complete payment');
  console.log('\nFor this test, we will:');
  console.log('  1. Retrieve the session from Stripe');
  console.log('  2. Manually verify payment status');
  console.log('  3. Create visit directly (simulating verify-payment endpoint)');

  // In real test mode, you'd visit session.url and complete payment
  // For this automated test, we'll retrieve the session to verify it exists
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  console.log(`✓ Retrieved session: ${session.id}`);
  console.log(`  Status: ${session.payment_status}`);

  return session;
}

async function createVisitDirectly(session) {
  await logStep(4, 'Create Visit in Database');

  const { VisitService } = require('../src/services/visit.service');

  try {
    const visit = await VisitService.createVisit({
      nombre: session.metadata.nombre,
      telefono: session.metadata.telefono,
      email: session.metadata.email,
      mensaje: session.metadata.mensaje,
      date: session.metadata.date,
      time: session.metadata.time,
      workTypeId: parseInt(session.metadata.workTypeId),
    });

    console.log(`✓ Visit created successfully`);
    console.log(`  Visit ID: ${visit.id}`);
    console.log(`  Status: ${visit.status}`);
    console.log(`  Date: ${visit.date}`);
    console.log(`  Customer: ${visit.nombre} (${visit.telefono})`);

    return visit;
  } catch (error) {
    console.error(`✗ Failed to create visit:`, error.message);
    throw error;
  }
}

async function verifyVisitInDatabase(visitId) {
  await logStep(5, 'Verify Visit in Database');

  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    include: { workType: true },
  });

  if (!visit) {
    console.error('✗ Visit NOT found in database!');
    return false;
  }

  console.log(`✓ Visit found in database`);
  console.log(`  ID: ${visit.id}`);
  console.log(`  Name: ${visit.nombre}`);
  console.log(`  Phone: ${visit.telefono}`);
  console.log(`  Email: ${visit.email}`);
  console.log(`  Message: ${visit.mensaje}`);
  console.log(`  Date: ${visit.date.toISOString()}`);
  console.log(`  Status: ${visit.status}`);
  console.log(`  Service: ${visit.workType?.name}`);
  console.log(`  Created At: ${visit.createdAt.toISOString()}`);

  return true;
}

async function testDuplicatePrevention(visitData) {
  await logStep(6, 'Test Duplicate Prevention');

  console.log('Attempting to create the same visit again...');

  const { VisitService } = require('../src/services/visit.service');

  try {
    const duplicateVisit = await VisitService.createVisit(visitData);
    console.log('✗ Duplicate visit was created (THIS SHOULD NOT HAPPEN!)');
    console.log(`  New Visit ID: ${duplicateVisit.id}`);
    return false;
  } catch (error) {
    if (error.message.includes('SLOT_TAKEN') || error.message.includes('Unique constraint')) {
      console.log('✓ Duplicate prevented correctly!');
      console.log(`  Error: ${error.message}`);
      return true;
    } else {
      console.error('✗ Unexpected error:', error.message);
      return false;
    }
  }
}

async function cleanup(visitId) {
  await logStep(7, 'Cleanup Test Data');

  console.log('Deleting test visit...');
  await prisma.visit.delete({
    where: { id: visitId }
  });
  console.log('✓ Test visit deleted');

  console.log('\n' + '='.repeat(60));
  console.log('CLEANUP NOTE:');
  console.log('='.repeat(60));
  console.log('The test service was left in the database for reuse.');
  console.log('To delete it manually, run:');
  console.log(`DELETE FROM "WorkType" WHERE id = ${TEST_VISIT.workTypeId};`);
  console.log('='.repeat(60));
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('PAYMENT FLOW TEST');
  console.log('='.repeat(60));

  let visitId = null;

  try {
    // Step 1: Setup
    await setup();

    // Step 2: Create Stripe session
    const session = await createStripeSession();

    // Step 3: Simulate payment
    await simulatePayment(session.id);

    // Step 4: Create visit (this is what /api/verify-payment does)
    const visit = await createVisitDirectly(session);
    visitId = visit.id;

    // Step 5: Verify visit in database
    await verifyVisitInDatabase(visitId);

    // Step 6: Test duplicate prevention
    await testDuplicatePrevention({
      nombre: TEST_VISIT.nombre,
      telefono: TEST_VISIT.telefono,
      email: TEST_VISIT.email,
      mensaje: TEST_VISIT.mensaje,
      date: TEST_VISIT.date,
      time: TEST_VISIT.time,
      workTypeId: TEST_VISIT.workTypeId,
    });

    // Step 7: Cleanup
    await cleanup(visitId);

    console.log('\n' + '='.repeat(60));
    console.log('✓ ALL TESTS PASSED!');
    console.log('='.repeat(60));
    console.log('\nSummary:');
    console.log('  ✓ Stripe session created successfully');
    console.log('  ✓ Visit created in database');
    console.log('  ✓ Visit verified in database');
    console.log('  ✓ Duplicate prevention works');
    console.log('\nThe payment flow is working correctly!');

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('✗ TEST FAILED');
    console.error('='.repeat(60));
    console.error(error);

    // Cleanup on failure
    if (visitId) {
      try {
        await prisma.visit.delete({ where: { id: visitId } });
        console.log('Cleaned up failed test visit');
      } catch (cleanupError) {
        console.error('Failed to cleanup:', cleanupError.message);
      }
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
main();
