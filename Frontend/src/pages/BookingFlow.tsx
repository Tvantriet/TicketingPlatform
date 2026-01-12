import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, Booking, Ticket } from '../api/client';

type BookingStep = 'confirm' | 'payment' | 'complete';

export default function BookingFlow() {
  const { eventId, ticketId } = useParams();
  const navigate = useNavigate();

  const [step, setStep] = useState<BookingStep>('confirm');
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
  });

  useEffect(() => {
    loadTicket();
  }, [ticketId]);

  useEffect(() => {
    if (booking && booking.status === 'confirmed') {
      setStep('complete');
    }
  }, [booking]);

  const loadTicket = async () => {
    try {
      const data = await api.getTicket(parseInt(ticketId!));
      setTicket(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ticket');
    }
  };

  const handleCreateBooking = async () => {
    try {
      setLoading(true);
      setError('');
      const userId = `user_${Math.random().toString(36).substr(2, 9)}`;
      const result = await api.createBooking(
        parseInt(ticketId!),
        userId,
        ticket!.price
      );
      setBooking(result);
      setStep('payment');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      await api.submitPayment(booking!.bookingId, paymentDetails);
      // Poll for status
      pollBookingStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit payment');
      setLoading(false);
    }
  };

  const pollBookingStatus = async () => {
    let attempts = 0;
    const maxAttempts = 20;
    const interval = setInterval(async () => {
      try {
        const status = await api.getBookingStatus(booking!.bookingId);
        setBooking(status);
        
        if (status.status === 'confirmed') {
          clearInterval(interval);
          setStep('complete');
          setLoading(false);
        } else if (status.status === 'failed') {
          clearInterval(interval);
          setError('Payment failed. Please try again.');
          setLoading(false);
        }
        
        attempts++;
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          setError('Payment processing is taking longer than expected.');
          setLoading(false);
        }
      } catch (err) {
        clearInterval(interval);
        setError('Failed to check booking status');
        setLoading(false);
      }
    }, 2000);
  };

  if (!ticket) return <div className="loading">Loading...</div>;

  return (
    <div className="booking-container">
      <h1>Book Ticket</h1>

      <div className="booking-steps">
        <div className={`booking-step ${step === 'confirm' ? 'active' : ''}`}>
          <div className="booking-step-number">1</div>
          <span>Confirm</span>
        </div>
        <div className={`booking-step ${step === 'payment' ? 'active' : ''}`}>
          <div className="booking-step-number">2</div>
          <span>Payment</span>
        </div>
        <div className={`booking-step ${step === 'complete' ? 'active' : ''}`}>
          <div className="booking-step-number">3</div>
          <span>Complete</span>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {step === 'confirm' && (
        <div className="card">
          <h2>Booking Summary</h2>
          <div className="booking-summary">
            <div className="summary-row">
              <span>Ticket ID:</span>
              <span>#{ticket.id}</span>
            </div>
            <div className="summary-row">
              <span>Event ID:</span>
              <span>#{ticket.eventId}</span>
            </div>
            <div className="summary-row total">
              <span>Total:</span>
              <span>${ticket.price.toFixed(2)}</span>
            </div>
          </div>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>
            ⏱️ You'll have 10 minutes to complete payment after confirming.
          </p>
          <div className="form-actions">
            <button
              onClick={handleCreateBooking}
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Confirm Booking'}
            </button>
            <button
              onClick={() => navigate(`/events/${eventId}`)}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {step === 'payment' && booking && (
        <div className="card">
          <h2>Payment Details</h2>
          <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
            Booking created! ID: {booking.bookingId}
            <br />
            Expires at: {new Date(booking.expiresAt!).toLocaleTimeString()}
          </div>
          <form onSubmit={handleSubmitPayment} className="payment-form">
            <div className="form-group">
              <label htmlFor="cardName">Cardholder Name</label>
              <input
                type="text"
                id="cardName"
                value={paymentDetails.cardName}
                onChange={(e) =>
                  setPaymentDetails((p) => ({ ...p, cardName: e.target.value }))
                }
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="cardNumber">Card Number</label>
              <input
                type="text"
                id="cardNumber"
                placeholder="1234 5678 9012 3456"
                value={paymentDetails.cardNumber}
                onChange={(e) =>
                  setPaymentDetails((p) => ({ ...p, cardNumber: e.target.value }))
                }
                required
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label htmlFor="expiryDate">Expiry Date</label>
                <input
                  type="text"
                  id="expiryDate"
                  placeholder="MM/YY"
                  value={paymentDetails.expiryDate}
                  onChange={(e) =>
                    setPaymentDetails((p) => ({ ...p, expiryDate: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="cvv">CVV</label>
                <input
                  type="text"
                  id="cvv"
                  placeholder="123"
                  value={paymentDetails.cvv}
                  onChange={(e) =>
                    setPaymentDetails((p) => ({ ...p, cvv: e.target.value }))
                  }
                  required
                />
              </div>
            </div>
            <div className="booking-summary">
              <div className="summary-row total">
                <span>Amount to Pay:</span>
                <span>${booking.amount.toFixed(2)}</span>
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Processing...' : 'Submit Payment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {step === 'complete' && booking && (
        <div className="card">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
            <h2>Booking Confirmed!</h2>
            <p style={{ fontSize: '1.2rem', color: '#666', margin: '1rem 0' }}>
              Your booking ID: <strong>{booking.bookingId}</strong>
            </p>
            <div className="booking-summary">
              <div className="summary-row">
                <span>Status:</span>
                <span style={{ color: '#155724', fontWeight: 'bold' }}>
                  {booking.status}
                </span>
              </div>
              <div className="summary-row">
                <span>Ticket ID:</span>
                <span>#{booking.ticketId}</span>
              </div>
              <div className="summary-row total">
                <span>Paid:</span>
                <span>${booking.amount.toFixed(2)}</span>
              </div>
            </div>
            <div className="form-actions" style={{ justifyContent: 'center' }}>
              <button onClick={() => navigate('/')} className="btn-primary">
                Back to Events
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

