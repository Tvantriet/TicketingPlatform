import { Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import EventList from './pages/EventList';
import EventForm from './pages/EventForm';
import EventDetail from './pages/EventDetail';
import BookingFlow from './pages/BookingFlow';
import Login from './pages/Login';
import Register from './pages/Register';
import './App.css';

function Navigation() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="container">
        <Link to="/" className="logo">
          Ticketing Platform
        </Link>
        <div className="nav-links">
          <Link to="/">Events</Link>
          {isAuthenticated ? (
            <>
              <Link to="/events/new" className="btn-primary">
                + Create Event
              </Link>
              <span style={{ marginLeft: '1rem' }}>
                Welcome, {user?.userName}
              </span>
              <button 
                onClick={logout}
                style={{
                  marginLeft: '1rem',
                  padding: '0.5rem 1rem',
                  background: 'transparent',
                  border: '1px solid #fff',
                  color: '#fff',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register" className="btn-primary">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <AuthProvider>
      <div className="app">
        <Navigation />

        <main className="container">
          <Routes>
            <Route path="/" element={<EventList />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/events/new" element={<EventForm />} />
            <Route path="/events/:id" element={<EventDetail />} />
            <Route path="/events/:id/edit" element={<EventForm />} />
            <Route path="/events/:eventId/book/:ticketId" element={<BookingFlow />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}

export default App;

