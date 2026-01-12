import { Routes, Route, Link } from 'react-router-dom';
import EventList from './pages/EventList';
import EventForm from './pages/EventForm';
import EventDetail from './pages/EventDetail';
import BookingFlow from './pages/BookingFlow';
import './App.css';

function App() {
  return (
    <div className="app">
      <nav className="navbar">
        <div className="container">
          <Link to="/" className="logo">
            🎟️ Ticketing Platform
          </Link>
          <div className="nav-links">
            <Link to="/">Events</Link>
            <Link to="/events/new" className="btn-primary">
              + Create Event
            </Link>
          </div>
        </div>
      </nav>

      <main className="container">
        <Routes>
          <Route path="/" element={<EventList />} />
          <Route path="/events/new" element={<EventForm />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/events/:id/edit" element={<EventForm />} />
          <Route path="/events/:eventId/book/:ticketId" element={<BookingFlow />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;

