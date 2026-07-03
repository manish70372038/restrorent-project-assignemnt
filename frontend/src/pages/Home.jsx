import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { user } = useAuth();

  return (
    <div className="page-container">
      <div className="hero">
        <h1>Welcome to the Restaurant Reservation System</h1>
        <p>Book a table in a few clicks, or manage all bookings as an admin.</p>
        {!user && (
          <div className="hero-actions">
            <Link className="btn btn-primary" to="/login">
              Login
            </Link>
            <Link className="btn btn-secondary" to="/register">
              Register
            </Link>
          </div>
        )}
        {user && user.role !== 'admin' && (
          <div className="hero-actions">
            <Link className="btn btn-primary" to="/reserve">
              Make a Reservation
            </Link>
            <Link className="btn btn-secondary" to="/my-reservations">
              My Reservations
            </Link>
          </div>
        )}
        {user && user.role === 'admin' && (
          <div className="hero-actions">
            <Link className="btn btn-primary" to="/admin">
              Go to Admin Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
