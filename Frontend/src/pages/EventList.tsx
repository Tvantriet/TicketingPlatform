import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Event } from '../api/client';

export default function EventList() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await api.getEvents();
      setEvents(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading events...</div>;

  return (
    <div>
      <h1>Upcoming Events</h1>

      {error && <div className="alert alert-error">{error}</div>}

      {events.length === 0 ? (
        <div className="card">
          <p style={{ textAlign: 'center', color: '#666' }}>
            No events yet. Create your first event!
          </p>
        </div>
      ) : (
        <div className="event-grid">
          {events.map((event) => (
            <div
              key={event.id}
              className="event-card"
              onClick={() => navigate(`/events/${event.id}`)}
            >
              {event.imageUrl ? (
                <img src={event.imageUrl} alt={event.name} className="event-card-image" />
              ) : (
                <div className="event-card-image" />
              )}
              <div className="event-card-content">
                <h3>{event.name}</h3>
                <p>📍 {event.venue}</p>
                <p>📅 {new Date(event.date).toLocaleDateString()}</p>
                <p>💰 ${event.price.toFixed(2)}</p>
                <p style={{ fontSize: '0.9rem', color: '#999' }}>
                  Capacity: {event.capacity}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

