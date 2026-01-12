// k6 Load Testing Scenarios for Ticketing Platform
// Install k6: https://k6.io/docs/getting-started/installation/
// Run: k6 run load-test-scenarios.js

import http from 'k6/http';
import { check, sleep } from 'k6';

// Configuration
const BOOKING_SERVICE = 'http://localhost:3003';
const EVENT_SERVICE = 'http://localhost:3001';

export let options = {
  scenarios: {
    // Scenario 1: Gradual load increase on BookingService
    booking_load: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '10s', target: 50 },   // Ramp up to 10 users
        { duration: '30s', target: 250 },    // Ramp up to 50 users (trigger scaling)
        { duration: '1m', target: 500 },   // Peak load (max scaling)
        { duration: '20s', target: 80 },    // Ramp down
        { duration: '10s', target: 0 },    // Cool down
      ],
      gracefulRampDown: '30s',
      exec: 'bookingScenario',
    },
    
    // Scenario 2: Spike test on EventService
    // Sudden burst to test rapid scaling
    event_spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 0 },     // Wait for booking test to start
        { duration: '20s', target: 80 },    // Sudden spike
        { duration: '2m', target: 80 },     // Hold spike
        { duration: '30s', target: 0 },     // Drop off
      ],
      gracefulRampDown: '20s',
      exec: 'eventScenario',
    },
  },
  
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.1'],    // Less than 10% failure rate
  },
};

// Scenario 1: Booking workflow
export function bookingScenario() {
  // Health check (lightweight)
  let healthRes = http.get(`${BOOKING_SERVICE}/health`);
  check(healthRes, {
    'booking health check is 200': (r) => r.status === 200,
  });
  
  // Simulate booking operations
  let bookingRes = http.get(`${BOOKING_SERVICE}/api/bookings`);
  check(bookingRes, {
    'booking list retrieved': (r) => r.status === 200 || r.status === 404,
  });
  
  sleep(0.5); // Think time
}

// Scenario 2: Event queries (database intensive)
export function eventScenario() {
  // Health check
  let healthRes = http.get(`${EVENT_SERVICE}/health`);
  check(healthRes, {
    'event health check is 200': (r) => r.status === 200,
  });
  
  // Query events
  let eventsRes = http.get(`${EVENT_SERVICE}/api/events`);
  check(eventsRes, {
    'events retrieved': (r) => r.status === 200,
  });
  
  // Query tickets
  let ticketsRes = http.get(`${EVENT_SERVICE}/api/tickets`);
  check(ticketsRes, {
    'tickets retrieved': (r) => r.status === 200 || r.status === 404,
  });
  
  sleep(0.3); // Think time
}

// Summary handler
export function handleSummary(data) {
  return {
    'summary.json': JSON.stringify(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  return `
========== Load Test Summary ==========
Duration: ${data.state.testRunDurationMs}ms
VUs Max: ${data.metrics.vus_max.values.max}
Requests: ${data.metrics.http_reqs.values.count}
Failed: ${data.metrics.http_req_failed.values.passes}
Avg Duration: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
p95 Duration: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
=======================================
  `;
}

