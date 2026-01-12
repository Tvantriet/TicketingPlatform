const API_BASE = '/api';

export interface Event {
  id: number;
  name: string;
  description: string;
  venue: string;
  date: string;
  capacity: number;
  price: number;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Ticket {
  id: number;
  eventId: number;
  status: 'available' | 'reserved' | 'booked';
  price: number;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  bookingId: string;
  status: 'pending' | 'payment_submitted' | 'confirmed' | 'failed' | 'expired';
  expiresAt?: string;
  ticketId: number;
  userId: string;
  amount: number;
}

class ApiClient {
  // Events
  async getEvents(): Promise<Event[]> {
    const res = await fetch(`${API_BASE}/events`);
    if (!res.ok) throw new Error('Failed to fetch events');
    return res.json();
  }

  async getEvent(id: number): Promise<Event> {
    const res = await fetch(`${API_BASE}/events/${id}`);
    if (!res.ok) throw new Error('Failed to fetch event');
    return res.json();
  }

  async createEvent(data: FormData): Promise<Event> {
    const res = await fetch(`${API_BASE}/events`, {
      method: 'POST',
      body: data,
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to create event');
    }
    return res.json();
  }

  async updateEvent(id: number, data: FormData): Promise<Event> {
    const res = await fetch(`${API_BASE}/events/${id}`, {
      method: 'PUT',
      body: data,
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to update event');
    }
    return res.json();
  }

  async deleteEvent(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/events/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete event');
  }

  // Tickets
  async getTicketsByEvent(eventId: number): Promise<Ticket[]> {
    const res = await fetch(`${API_BASE}/tickets/event/${eventId}`);
    if (!res.ok) throw new Error('Failed to fetch tickets');
    return res.json();
  }

  async getTicket(id: number): Promise<Ticket> {
    const res = await fetch(`${API_BASE}/tickets/${id}`);
    if (!res.ok) throw new Error('Failed to fetch ticket');
    return res.json();
  }

  // Bookings
  async createBooking(ticketId: number, userId: string, amount: number): Promise<Booking> {
    const res = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId, userId, amount }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to create booking');
    }
    return res.json();
  }

  async submitPayment(bookingId: string, paymentDetails: any): Promise<Booking> {
    const res = await fetch(`${API_BASE}/bookings/${bookingId}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentDetails }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to submit payment');
    }
    return res.json();
  }

  async getBookingStatus(bookingId: string): Promise<Booking> {
    const res = await fetch(`${API_BASE}/bookings/${bookingId}`);
    if (!res.ok) throw new Error('Failed to fetch booking status');
    return res.json();
  }
}

export const api = new ApiClient();

