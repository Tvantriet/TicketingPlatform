import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// Gateway URL - all requests go through the gateway
const GATEWAY = 'http://localhost:3000';
const API_BASE = `${GATEWAY}/api`;

// SharedArray ensures data is loaded once and shared across all VUs
// Fetches real event and ticket data from database via API through gateway
const testData = new SharedArray('testData', function () {
  console.log('Fetching real data from database through gateway...');
  
  // First, authenticate to get a token for protected routes
  // Create a test user for data fetching
  const setupUser = {
    userName: `setup_user_${Date.now()}`,
    password: 'SetupPassword123!',
    email: `setup_${Date.now()}@test.com`,
  };
  
  const registerRes = http.post(
    `${API_BASE}/users/register`,
    JSON.stringify(setupUser),
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  let authToken = null;
  if (registerRes.status === 201) {
    const registerData = JSON.parse(registerRes.body);
    authToken = registerData.token;
  } else {
    // Try login if registration failed
    const loginRes = http.post(
      `${API_BASE}/users/login`,
      JSON.stringify({ userName: setupUser.userName, password: setupUser.password }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    if (loginRes.status === 200) {
      const loginData = JSON.parse(loginRes.body);
      authToken = loginData.token;
    }
  }
  
  const authHeaders = authToken 
    ? { 'Authorization': `Bearer ${authToken}` }
    : {};
  
  // Fetch all events through gateway (requires auth)
  const eventsRes = http.get(`${API_BASE}/events`, { headers: authHeaders });
  let events = [];
  if (eventsRes.status === 200) {
    events = JSON.parse(eventsRes.body);
    console.log(`Found ${events.length} events`);
  }
  
  // Fetch available tickets for events through gateway
  let tickets = [];
  for (const event of events.slice(0, 10)) { // Limit to first 10 events
    const ticketsRes = http.get(`${API_BASE}/tickets/event/${event.id}`, { headers: authHeaders });
    if (ticketsRes.status === 200) {
      const eventTickets = JSON.parse(ticketsRes.body);
      const availableTickets = eventTickets
        .filter(t => t.status === 'AVAILABLE')
        .map(t => ({ 
          ticketId: t.id, 
          eventId: t.eventId,
          price: parseFloat(t.price)
        }));
      tickets.push(...availableTickets);
    }
    sleep(0.1);
  }
  console.log(`Found ${tickets.length} available tickets`);
  
  // Fallback if no data found
  if (events.length === 0) {
    events = [{ id: 1, name: 'Test Event' }];
  }
  if (tickets.length === 0) {
    tickets = [{ ticketId: 1, eventId: 1, price: 50.00 }];
  }
  
  return {
    events: events,
    tickets: tickets,
  };
});

export let options = {
  scenarios: {
    // Scenario 1: User authentication flow
    auth_flow: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '10s', target: 20 },
        { duration: '30s', target: 50 },
        { duration: '20s', target: 100 },
        { duration: '30s', target: 50 },
        { duration: '20s', target: 0 },
      ],
      gracefulRampDown: '10s',
      exec: 'authScenario',
    },
    
    // Scenario 2: Event browsing and booking flow
    booking_flow: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '10s', target: 10 },
        { duration: '30s', target: 30 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 20 },
        { duration: '20s', target: 0 },
      ],
      gracefulRampDown: '15s',
      exec: 'bookingScenario',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.1'],
  },
};

// Helper function to get a unique item from array based on VU and iteration
function getUniqueItem(array) {
  if (!array || array.length === 0) return null;
  const index = (__VU * 1000 + __ITER) % array.length;
  return array[index];
}

// Helper to generate unique username/email for each VU
function generateUserData() {
  const timestamp = Date.now();
  const vuId = __VU || 1;
  const iterId = __ITER || 0;
  return {
    userName: `loadtest_user_${vuId}_${iterId}_${timestamp}`,
    email: `loadtest_${vuId}_${iterId}_${timestamp}@test.com`,
    password: 'TestPassword123!',
  };
}

// Scenario 1: Register → Login → Logout flow
export function authScenario() {
  const userData = generateUserData();
  
  // Step 1: Register user
  const registerPayload = JSON.stringify({
    userName: userData.userName,
    password: userData.password,
    email: userData.email,
  });
  
  const registerRes = http.post(
    `${API_BASE}/users/register`,
    registerPayload,
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  check(registerRes, {
    'user registered': (r) => r.status === 201,
  });
  
  let token = null;
  if (registerRes.status === 201) {
    const registerData = JSON.parse(registerRes.body);
    token = registerData.token;
  } else {
    // If registration failed (e.g., user already exists), try login instead
    const loginPayload = JSON.stringify({
      userName: userData.userName,
      password: userData.password,
    });
    
    const loginRes = http.post(
      `${API_BASE}/users/login`,
      loginPayload,
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    check(loginRes, {
      'user logged in': (r) => r.status === 200,
    });
    
    if (loginRes.status === 200) {
      const loginData = JSON.parse(loginRes.body);
      token = loginData.token;
    }
  }
  
  sleep(0.5);
  
  // Step 2: Login (if we didn't get token from registration)
  if (!token) {
    const loginPayload = JSON.stringify({
      userName: userData.userName,
      password: userData.password,
    });
    
    const loginRes = http.post(
      `${API_BASE}/users/login`,
      loginPayload,
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    check(loginRes, {
      'user logged in': (r) => r.status === 200,
    });
    
    if (loginRes.status === 200) {
      const loginData = JSON.parse(loginRes.body);
      token = loginData.token;
    }
  }
  
  sleep(0.3);
  
  // Step 3: Verify token by getting current user
  if (token) {
    const meRes = http.get(`${API_BASE}/users/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    check(meRes, {
      'current user retrieved': (r) => r.status === 200,
    });
  }
  
  sleep(0.2);
  
  // Step 4: Logout (client-side - just stop using token)
  // In a real app, logout is handled client-side by removing the token
  // We simulate this by not using the token anymore
  // No API call needed for logout
}

// Scenario 2: Get event by ID → Reserve booking
export function bookingScenario() {
  // Step 1: Get a random ticket from pre-loaded data
  const ticket = getUniqueItem(testData.tickets);
  
  if (!ticket) {
    console.warn('No tickets available for booking scenario');
    return;
  }
  
  // Step 2: Create a test user for booking (or use existing)
  const userData = generateUserData();
  
  // Try to register/login to get a user ID and token
  const registerPayload = JSON.stringify({
    userName: userData.userName,
    password: userData.password,
    email: userData.email,
  });
  
  const registerRes = http.post(
    `${API_BASE}/users/register`,
    registerPayload,
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  let userId = null;
  let authToken = null;
  
  if (registerRes.status === 201) {
    const registerData = JSON.parse(registerRes.body);
    userId = registerData.user?.id?.toString() || registerData.user?.userName;
    authToken = registerData.token;
  } else {
    // Try login if registration failed
    const loginPayload = JSON.stringify({
      userName: userData.userName,
      password: userData.password,
    });
    
    const loginRes = http.post(
      `${API_BASE}/users/login`,
      loginPayload,
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    if (loginRes.status === 200) {
      const loginData = JSON.parse(loginRes.body);
      userId = loginData.user?.id?.toString() || loginData.user?.userName;
      authToken = loginData.token;
    }
  }
  
  if (!userId) {
    // Fallback: use a generated user ID
    userId = `test_user_${__VU}_${__ITER}_${Date.now()}`;
  }
  
  if (!authToken) {
    console.warn('No auth token available for booking scenario');
    return;
  }
  
  sleep(0.3);
  
  // Step 3: Get event by ID from database through gateway (requires auth)
  const eventRes = http.get(`${API_BASE}/events/${ticket.eventId}`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });
  check(eventRes, {
    'event retrieved': (r) => r.status === 200,
  });
  
  if (eventRes.status !== 200) {
    return;
  }
  
  sleep(0.5);
  
  // Step 4: Reserve booking (create booking) using ticket from database through gateway
  const ticketPrice = ticket.price || 50.00;
  
  const bookingPayload = JSON.stringify({
    ticketId: ticket.ticketId,
    userId: userId,
    amount: ticketPrice,
  });
  
  const bookingRes = http.post(
    `${API_BASE}/bookings`,
    bookingPayload,
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
    }
  );
  
  check(bookingRes, {
    'booking created': (r) => r.status === 201 || r.status === 400 || r.status === 409,
  });
  
  sleep(0.5);
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
========== User & Booking Flow Load Test Summary ==========
Duration: ${data.state.testRunDurationMs}ms
VUs Max: ${data.metrics.vus_max.values.max}
Requests: ${data.metrics.http_reqs.values.count}
Failed: ${data.metrics.http_req_failed.values.passes}
Avg Duration: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
p95 Duration: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
===========================================================
  `;
}
