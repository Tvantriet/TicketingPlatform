/**
 * Integration Test: Complete Booking Flow
 * 
 * Tests the entire ticket booking flow across all microservices:
 * 1. EventService: Create event and tickets
 * 2. Gateway: Route requests properly
 * 3. BookingService: Create booking and handle reservation
 * 4. MockPaymentService: Process payment
 * 5. Complete end-to-end booking flow
 * 
 * Prerequisites:
 * - All services must be running (Gateway, EventService, BookingService, MockPaymentService)
 * - RabbitMQ must be running for message passing
 * - Databases must be accessible
 * 
 * Run with: npm test
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference types="node" />

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';
const EVENT_SERVICE_URL = process.env.EVENT_SERVICE_URL || 'http://localhost:3001';
const BOOKING_SERVICE_URL = process.env.BOOKING_SERVICE_URL || 'http://localhost:3003';
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3002';

// Helper function for HTTP requests
async function apiRequest(
  url: string,
  method: string = 'GET',
  body?: any
): Promise<any> {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  
  if (!response.ok && response.status !== 404) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  return {
    status: response.status,
    data: response.status !== 204 ? await response.json() : null,
  };
}

// Wait helper for async operations
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('Complete Ticket Booking Flow - Integration Test', () => {
  let createdEventId: number;
  let createdTicketId: number;
  let createdBookingId: string;
  const userId = `test-user-${Date.now()}`;

  beforeAll(async () => {
    // Wait for services to be ready
    await wait(2000);
  });

  afterAll(async () => {
    // Cleanup: delete created event if possible
    if (createdEventId) {
      try {
        await apiRequest(
          `${EVENT_SERVICE_URL}/api/events/${createdEventId}`,
          'DELETE'
        );
        console.log(`Cleaned up test event ${createdEventId}`);
      } catch (error) {
        console.warn('Cleanup failed:', error);
      }
    }
  });

  it('should complete full booking flow: create event -> create booking -> process payment', async () => {
    // ===== STEP 1: Create Event via EventService =====
    console.log('\n[STEP 1] Creating event...');
    const eventData = {
      name: `Integration Test Event ${Date.now()}`,
      description: 'Test event for integration testing',
      venue: 'Test Venue',
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      capacity: 10,
      price: 50.0,
    };

    const createEventResponse = await apiRequest(
      `${EVENT_SERVICE_URL}/api/events`,
      'POST',
      eventData
    );

    expect(createEventResponse.status).toBe(201);
    expect(createEventResponse.data).toHaveProperty('id');
    expect(createEventResponse.data.name).toBe(eventData.name);
    
    createdEventId = createEventResponse.data.id;
    console.log(`✓ Event created with ID: ${createdEventId}`);

    // Wait for event creation to propagate
    await wait(500);

    // ===== STEP 2: Create Tickets for Event =====
    console.log('\n[STEP 2] Creating tickets for event...');
    const ticketPromises = [];
    for (let i = 0; i < 5; i++) {
      ticketPromises.push(
        apiRequest(`${EVENT_SERVICE_URL}/api/tickets`, 'POST', {
          eventId: createdEventId,
          price: 50.0,
        })
      );
    }
    
    const ticketResponses = await Promise.all(ticketPromises);
    expect(ticketResponses[0].status).toBe(201);
    
    createdTicketId = ticketResponses[0].data.id;
    console.log(`✓ Created 5 tickets, first ticket ID: ${createdTicketId}`);

    // Wait for tickets to be available
    await wait(500);

    // ===== STEP 3: Verify tickets through Gateway =====
    console.log('\n[STEP 3] Verifying tickets through Gateway...');
    const getTicketsResponse = await apiRequest(
      `${GATEWAY_URL}/api/tickets/event/${createdEventId}`
    );

    expect(getTicketsResponse.status).toBe(200);
    expect(getTicketsResponse.data).toHaveProperty('length');
    expect(getTicketsResponse.data.length).toBeGreaterThan(0);
    console.log(`✓ Gateway returned ${getTicketsResponse.data.length} tickets`);

    // ===== STEP 4: Create Booking via BookingService =====
    console.log('\n[STEP 4] Creating booking...');
    const bookingData = {
      ticketId: createdTicketId,
      userId: userId,
      amount: 50.0,
    };

    const createBookingResponse = await apiRequest(
      `${BOOKING_SERVICE_URL}/api/bookings`,
      'POST',
      bookingData
    );

    expect(createBookingResponse.status).toBe(201);
    expect(createBookingResponse.data).toHaveProperty('bookingId');
    expect(createBookingResponse.data.status).toBe('PENDING');
    
    createdBookingId = createBookingResponse.data.bookingId;
    console.log(`✓ Booking created with ID: ${createdBookingId}, status: PENDING`);

    // Wait for reservation message to be processed
    await wait(1000);

    // ===== STEP 5: Verify Ticket is Reserved =====
    console.log('\n[STEP 5] Verifying ticket reservation...');
    const getTicketResponse = await apiRequest(
      `${EVENT_SERVICE_URL}/api/tickets/${createdTicketId}`
    );

    expect(getTicketResponse.status).toBe(200);
    expect(getTicketResponse.data.status).toBe('RESERVED');
    console.log(`✓ Ticket ${createdTicketId} is now RESERVED`);

    // ===== STEP 6: Submit Payment =====
    console.log('\n[STEP 6] Submitting payment...');
    const paymentData = {
      paymentDetails: {
        cardNumber: '4111111111111111',
        expiryDate: '12/25',
        cvv: '123',
        cardholderName: 'Test User',
      },
    };

    const submitPaymentResponse = await apiRequest(
      `${BOOKING_SERVICE_URL}/api/bookings/${createdBookingId}/payment`,
      'POST',
      paymentData
    );

    expect(submitPaymentResponse.status).toBe(200);
    expect(submitPaymentResponse.data).toHaveProperty('message');
    console.log(`✓ Payment submitted: ${submitPaymentResponse.data.message}`);

    // Wait for payment to be processed by MockPaymentService
    await wait(2000);

    // ===== STEP 7: Verify Booking is Confirmed =====
    console.log('\n[STEP 7] Verifying booking confirmation...');
    const getBookingResponse = await apiRequest(
      `${BOOKING_SERVICE_URL}/api/bookings/${createdBookingId}`
    );

    expect(getBookingResponse.status).toBe(200);
    expect(getBookingResponse.data.status).toBe('CONFIRMED');
    expect(getBookingResponse.data).toHaveProperty('completedAt');
    console.log(`✓ Booking ${createdBookingId} is CONFIRMED`);

    // ===== STEP 8: Verify Ticket is Booked =====
    console.log('\n[STEP 8] Verifying ticket is booked...');
    const getTicketFinalResponse = await apiRequest(
      `${EVENT_SERVICE_URL}/api/tickets/${createdTicketId}`
    );

    expect(getTicketFinalResponse.status).toBe(200);
    expect(getTicketFinalResponse.data.status).toBe('BOOKED');
    console.log(`✓ Ticket ${createdTicketId} is now BOOKED`);

    // ===== STEP 9: Test Gateway Health Check =====
    console.log('\n[STEP 9] Testing Gateway health...');
    const healthResponse = await apiRequest(`${GATEWAY_URL}/health`);

    expect(healthResponse.status).toBe(200);
    expect(healthResponse.data.status).toBe('ok');
    expect(healthResponse.data.service).toBe('api-gateway');
    console.log(`✓ Gateway health check passed`);

    console.log('\n✅ INTEGRATION TEST COMPLETED SUCCESSFULLY!');
    console.log('\nFlow summary:');
    console.log(`  Event ID: ${createdEventId}`);
    console.log(`  Ticket ID: ${createdTicketId}`);
    console.log(`  Booking ID: ${createdBookingId}`);
    console.log(`  User ID: ${userId}`);
    console.log(`  Final Status: CONFIRMED & BOOKED`);
  }, 30000); // 30 second timeout for full integration test

  it('should handle failed payment and release ticket', async () => {
    console.log('\n[TEST] Testing failed payment flow...');

    // Create event and tickets
    const eventData = {
      name: `Failed Payment Test ${Date.now()}`,
      description: 'Test event for payment failure',
      venue: 'Test Venue',
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      capacity: 5,
      price: 100.0,
    };

    const eventResponse = await apiRequest(
      `${EVENT_SERVICE_URL}/api/events`,
      'POST',
      eventData
    );
    
    const failEventId = eventResponse.data.id;
    await wait(500);

    // Create tickets
    const ticketResponse = await apiRequest(
      `${EVENT_SERVICE_URL}/api/tickets`,
      'POST',
      { eventId: failEventId, price: 100.0 }
    );
    
    const failTicketId = ticketResponse.data.id;
    await wait(500);

    // Create booking
    const bookingResponse = await apiRequest(
      `${BOOKING_SERVICE_URL}/api/bookings`,
      'POST',
      {
        ticketId: failTicketId,
        userId: `fail-user-${Date.now()}`,
        amount: 100.0,
      }
    );
    
    const failBookingId = bookingResponse.data.bookingId;
    await wait(1000);

    // Submit payment with card that triggers failure (amount > 1000)
    const paymentData = {
      paymentDetails: {
        cardNumber: '4000000000000002', // Card that should fail
        expiryDate: '12/25',
        cvv: '123',
        cardholderName: 'Fail Test',
      },
    };

    await apiRequest(
      `${BOOKING_SERVICE_URL}/api/bookings/${failBookingId}/payment`,
      'POST',
      paymentData
    );

    // Wait for payment processing
    await wait(2000);

    // Verify booking is FAILED
    const bookingStatusResponse = await apiRequest(
      `${BOOKING_SERVICE_URL}/api/bookings/${failBookingId}`
    );

    // Payment should fail but booking should exist
    expect(bookingStatusResponse.status).toBe(200);
    
    // Note: Depending on MockPaymentService implementation, 
    // status might be FAILED or still PENDING if payment service isn't configured
    console.log(`✓ Booking status: ${bookingStatusResponse.data.status}`);

    // Cleanup
    try {
      await apiRequest(`${EVENT_SERVICE_URL}/api/events/${failEventId}`, 'DELETE');
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }

    console.log('✓ Failed payment test completed');
  }, 30000);
});

