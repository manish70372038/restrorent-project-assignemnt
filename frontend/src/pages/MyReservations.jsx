import { useEffect, useState } from 'react';
import api from '../api/axios';

const statusClass = (status) => (status === 'cancelled' ? 'status-cancelled' : 'status-confirmed');

const MyReservations = () => {
  const [reservations, setReservations] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/reservations/my');
      setReservations(data.reservations);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reservations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCancel = async (id) => {
    setCancellingId(id);
    setError('');
    try {
      await api.patch(`/reservations/${id}/cancel`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Cancel failed');
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) return <div className="page-container">Loading...</div>;

  return (
    <div className="page-container">
      <h2>My Reservations</h2>
      {error && <div className="alert alert-error">{error}</div>}
      {reservations.length === 0 ? (
        <p>You have no reservations yet.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time Slot</th>
              <th>Table</th>
              <th>Guests</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((r) => (
              <tr key={r._id}>
                <td>{r.date}</td>
                <td>{r.timeSlot}</td>
                <td>{r.table?.tableNumber ?? '—'}</td>
                <td>{r.guests}</td>
                <td>
                  <span className={`status ${statusClass(r.status)}`}>{r.status}</span>
                </td>
                <td>
                  {r.status !== 'cancelled' && (
                    <button
                      className="btn btn-danger"
                      onClick={() => handleCancel(r._id)}
                      disabled={cancellingId === r._id}
                    >
                      {cancellingId === r._id ? 'Cancelling...' : 'Cancel'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default MyReservations;
