const API_BASE = 'http://localhost:3000/api';

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

export interface User {
  id: number;
  userName: string;
  email?: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

class ApiClient {
  private getHeaders(includeAuth = false, isJson = true): HeadersInit {
    const headers: HeadersInit = {};
    
    if (isJson) {
      headers['Content-Type'] = 'application/json';
    }
    
    if (includeAuth) {
      const token = localStorage.getItem('authToken');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    
    return headers;
  }

  private async parseErrorResponse(res: Response): Promise<string> {
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        const error = await res.json();
        return error.error || error.message || `Request failed with status ${res.status}`;
      } catch {
        return `Request failed with status ${res.status}`;
      }
    } else {
      const text = await res.text();
      return text || `Request failed with status ${res.status}`;
    }
  }

  // Auth
  async register(userName: string, password: string, email?: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/users/register`, {
      method: 'POST',
      headers: this.getHeaders(false, true),
      body: JSON.stringify({ userName, password, email }),
    });
    if (!res.ok) {
      const errorMessage = await this.parseErrorResponse(res);
      throw new Error(errorMessage);
    }
    return res.json();
  }

  async login(userName: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/users/login`, {
      method: 'POST',
      headers: this.getHeaders(false, true),
      body: JSON.stringify({ userName, password }),
    });
    if (!res.ok) {
      const errorMessage = await this.parseErrorResponse(res);
      throw new Error(errorMessage);
    }
    return res.json();
  }

  async getCurrentUser(): Promise<User> {
    const res = await fetch(`${API_BASE}/users/me`, {
      headers: this.getHeaders(true, true),
    });
    if (!res.ok) throw new Error('Failed to fetch current user');
    return res.json();
  }

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
    const headers: HeadersInit = {};
    const token = localStorage.getItem('authToken');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const res = await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers,
      body: data,
    });
    if (!res.ok) {
      const errorMessage = await this.parseErrorResponse(res);
      throw new Error(errorMessage);
    }
    return res.json();
  }

  async updateEvent(id: number, data: FormData): Promise<Event> {
    const headers: HeadersInit = {};
    const token = localStorage.getItem('authToken');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const res = await fetch(`${API_BASE}/events/${id}`, {
      method: 'PUT',
      headers,
      body: data,
    });
    if (!res.ok) {
      const errorMessage = await this.parseErrorResponse(res);
      throw new Error(errorMessage);
    }
    return res.json();
  }

  async deleteEvent(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/events/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(true, true),
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
      headers: this.getHeaders(true, true),
      body: JSON.stringify({ ticketId, userId, amount }),
    });
    if (!res.ok) {
      const errorMessage = await this.parseErrorResponse(res);
      throw new Error(errorMessage);
    }
    return res.json();
  }

  async submitPayment(bookingId: string, paymentDetails: any): Promise<Booking> {
    const res = await fetch(`${API_BASE}/bookings/${bookingId}/payment`, {
      method: 'POST',
      headers: this.getHeaders(true, true),
      body: JSON.stringify({ paymentDetails }),
    });
    if (!res.ok) {
      const errorMessage = await this.parseErrorResponse(res);
      throw new Error(errorMessage);
    }
    return res.json();
  }

  async getBookingStatus(bookingId: string): Promise<Booking> {
    const res = await fetch(`${API_BASE}/bookings/${bookingId}`, {
      headers: this.getHeaders(true, true),
    });
    if (!res.ok) throw new Error('Failed to fetch booking status');
    return res.json();
  }
}

export const api = new ApiClient();

