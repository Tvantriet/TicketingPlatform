import http from 'k6/http';
import { check, sleep } from 'k6';

// Enige services in gebruik voor testing
const BOOKING_SERVICE = 'http://localhost:3003';
const EVENT_SERVICE = 'http://localhost:3001';

export let options = {
  scenarios: {
    // scenario 1 booking service
    booking_load: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '10s', target: 50 },   
        { duration: '10s', target: 250 },    
        { duration: '30s', target: 400 },   
        { duration: '30s', target: 30 },    
        { duration: '1m', target: 0 },    
      ],
      gracefulRampDown: '30s',
      exec: 'bookingScenario',
    },
    
    // Scenario 2: event service
    event_spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 0 },
        { duration: '20s', target: 80 },   
        { duration: '2m', target: 80 },     
        { duration: '30s', target: 0 },    
      ],
      gracefulRampDown: '20s',
      exec: 'eventScenario',
    },
  },
  // Thresholds die gehaald moeten worden voor toekmostige automatische testing
  thresholds: {
    http_req_duration: ['p(95)<500'], 
    http_req_failed: ['rate<0.1'],    
  },
};

// Scenario 1: booking service only simple endpoints to test
export function bookingScenario() {  
  let bookingRes = http.get(`${BOOKING_SERVICE}/api/bookings`);
  check(bookingRes, {
    'booking list retrieved': (r) => r.status === 200 || r.status === 404,
  });

  // reserve ticket
  let reserveRes = http.post(`${BOOKING_SERVICE}/api/bookings/1/reserve`);
  check(reserveRes, {
    'ticket reserved': (r) => r.status === 200,
  });
  
  sleep(0.5); // Think time to simulate user
}

// Scenario 2: Event queries ook testing placeholder (meer intensief)
export function eventScenario() {  
  // Query events
  let eventsRes = http.get(`${EVENT_SERVICE}/api/events`);
  check(eventsRes, {
    'events retrieved': (r) => r.status === 200,
  });

  // get event by id
  let eventRes = http.get(`${EVENT_SERVICE}/api/events/1`);
  check(eventRes, {
    'event retrieved': (r) => r.status === 200,
  });
  
  
  sleep(0.3); // Think time to simulate user
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

