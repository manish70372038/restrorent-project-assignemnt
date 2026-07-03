import { useEffect, useState } from 'react';
import api from '../api/axios';

const statusClass = (status) => (status === 'cancelled' ? 'status-cancelled' : 'status-confirmed');

const AdminDashboard = () => {
  const [reservations, setReservations] = useState([]);
  const [dateFilter, setDateFilter] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const [tables, setTables] = useState([]);
  const [newTable, setNewTable] = useState({ tableNumber: '', capacity: '' });

  const loadReservations = async (date) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/reservations', { params: date ? { date } : {} });
      setReservations(data.reservations);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reservations');
    } finally {
      setLoading(false);
    }
  };

  const loadTables = async () => {
    try {
      const { data } = await api.get('/tables');
      setTables(data.tables);
    } catch (err) {
      // non-fatal for the reservations view
    }
  };

  useEffect(() => {
    loadReservations('');
    loadTables();
  }, []);

  const handleFilter = (e) => {
    e.preventDefault();
    loadReservations(dateFilter);
  };

  const handleCancel = async (id) => {
    setBusyId(id);
    try {
      await api.delete(`/reservations/${id}`);
      await loadReservations(dateFilter);
    } catch (err) {
      setError(err.response?.data?.message || 'Cancel failed');
    } finally {
      setBusyId(null);
    }
  };

  const handleCreateTable = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/tables', {
        tableNumber: Number(newTable.tableNumber),
        capacity: Number(newTable.capacity),
      });
      setNewTable({ tableNumber: '', capacity: '' });
      await loadTables();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create table');
    }
  };

  const handleToggleTable = async (table) => {
    try {
      await api.put(`/tables/${table._id}`, { isActive: !table.isActive });
      await loadTables();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update table');
    }
  };

  return (
    <div className="page-container">
      <h2>Admin Dashboard</h2>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <h3>All Reservations</h3>
        <form className="filter-row" onSubmit={handleFilter}>
          <label>
            Filter by date
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </label>
          <button className="btn btn-primary" type="submit">
            Apply
          </button>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => {
              setDateFilter('');
              loadReservations('');
            }}
          >
            Clear
          </button>
        </form>

        {loading ? (
          <p>Loading...</p>
        ) : reservations.length === 0 ? (
          <p>No reservations found.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
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
                  <td>
                    {r.user?.name} <br />
                    <small>{r.user?.email}</small>
                  </td>
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
                        disabled={busyId === r._id}
                      >
                        {busyId === r._id ? 'Cancelling...' : 'Cancel'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3>Manage Tables</h3>
        <form className="filter-row" onSubmit={handleCreateTable}>
          <label>
            Table Number
            <input
              type="number"
              min="1"
              value={newTable.tableNumber}
              onChange={(e) => setNewTable({ ...newTable, tableNumber: e.target.value })}
              required
            />
          </label>
          <label>
            Capacity
            <input
              type="number"
              min="1"
              value={newTable.capacity}
              onChange={(e) => setNewTable({ ...newTable, capacity: e.target.value })}
              required
            />
          </label>
          <button className="btn btn-primary" type="submit">
            Add Table
          </button>
        </form>

        <table className="data-table">
          <thead>
            <tr>
              <th>Table #</th>
              <th>Capacity</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tables.map((t) => (
              <tr key={t._id}>
                <td>{t.tableNumber}</td>
                <td>{t.capacity}</td>
                <td>{t.isActive ? 'Active' : 'Inactive'}</td>
                <td>
                  <button className="btn btn-secondary" onClick={() => handleToggleTable(t)}>
                    {t.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboard;
