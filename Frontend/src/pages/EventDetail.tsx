import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, Event, Ticket } from '../api/client';

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [eventData, ticketsData] = await Promise.all([
        api.getEvent(parseInt(id!)),
        api.getTicketsByEvent(parseInt(id!)),
      ]);
      setEvent(eventData);
      setTickets(ticketsData);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      await api.deleteEvent(parseInt(id!));
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete event');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!event) return <div className="alert alert-error">Event not found</div>;

  const availableTickets = tickets.filter((t) => t.status === 'available');

  return (
    <div className="event-detail">
      <div className="event-detail-header">
        <h1>{event.name}</h1>
        <div className="event-detail-actions">
          <button
            onClick={() => navigate(`/events/${id}/edit`)}
            className="btn-secondary"
          >
            ✏️ Edit
          </button>
          <button onClick={handleDelete} className="btn-danger">
            🗑️ Delete
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {event.imageUrl ? (
        <img src={event.imageUrl} alt={event.name} className="event-detail-image" />
      ) : (
        <div className="event-detail-image" />
      )}

      <div className="card">
        <div className="event-info">
          {event.description && (
            <div>
              <strong>Description:</strong>
              <p>{event.description}</p>
            </div>
          )}
          <div className="info-row">
            <strong>Venue:</strong>
            <span>{event.venue}</span>
          </div>
          <div className="info-row">
            <strong>Date:</strong>
            <span>{new Date(event.date).toLocaleString()}</span>
          </div>
          <div className="info-row">
            <strong>Capacity:</strong>
            <span>{event.capacity}</span>
          </div>
          <div className="info-row">
            <strong>Price:</strong>
            <span>${event.price.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="tickets-section">
        <h2>Available Tickets ({availableTickets.length})</h2>
        {tickets.length === 0 ? (
          <div className="card">
            <p style={{ textAlign: 'center', color: '#666' }}>
              No tickets available yet.
            </p>
          </div>
        ) : (
          <div className="tickets-list">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="ticket-item">
                <div className="ticket-info">
                  <span>Ticket #{ticket.id}</span>
                  <span className={`ticket-status ${ticket.status}`}>
                    {ticket.status}
                  </span>
                  <span>${ticket.price.toFixed(2)}</span>
                </div>
                {ticket.status === 'available' && (
                  <button
                    onClick={() => navigate(`/events/${id}/book/${ticket.id}`)}
                    className="btn-primary"
                  >
                    Book Now
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

