import { useEffect, useState } from 'react';
import api from '../api/axios';

const NewReservation = () => {
  const [timeSlots, setTimeSlots] = useState([]);
  const [form, setForm] = useState({ date: '', timeSlot: '', guests: 1 });
  const [availableTables, setAvailableTables] = useState(null);
  const [selectedTableId, setSelectedTableId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    api.get('/tables').then(({ data }) => setTimeSlots(data.timeSlots));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setAvailableTables(null);
    setSelectedTableId('');
    setSuccess('');
  };

  const checkAvailability = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setChecking(true);
    setAvailableTables(null);
    try {
      const { data } = await api.get('/tables/available', {
        params: { date: form.date, timeSlot: form.timeSlot, guests: form.guests },
      });
      setAvailableTables(data.tables);
      if (data.tables.length === 0) {
        setError('No tables available for the selected date, time and party size. Try a different slot.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to check availability');
    } finally {
      setChecking(false);
    }
  };

  const handleBook = async () => {
    if (!selectedTableId) {
      setError('Please select a table first');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await api.post('/reservations', {
        tableId: selectedTableId,
        date: form.date,
        timeSlot: form.timeSlot,
        guests: Number(form.guests),
      });
      setSuccess('Reservation confirmed!');
      setAvailableTables(null);
      setSelectedTableId('');
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed. The table may have just been taken.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <h2>Make a Reservation</h2>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form className="card" onSubmit={checkAvailability}>
        <label>
          Date
          <input
            type="date"
            name="date"
            min={todayStr}
            value={form.date}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Time Slot
          <select name="timeSlot" value={form.timeSlot} onChange={handleChange} required>
            <option value="">Select a time slot</option>
            {timeSlots.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </select>
        </label>
        <label>
          Number of Guests
          <input
            type="number"
            name="guests"
            min="1"
            value={form.guests}
            onChange={handleChange}
            required
          />
        </label>
        <button className="btn btn-primary" type="submit" disabled={checking}>
          {checking ? 'Checking...' : 'Check Availability'}
        </button>
      </form>

      {availableTables && availableTables.length > 0 && (
        <div className="card">
          <h3>Available Tables</h3>
          <div className="table-options">
            {availableTables.map((t) => (
              <label key={t._id} className="table-option">
                <input
                  type="radio"
                  name="table"
                  value={t._id}
                  checked={selectedTableId === t._id}
                  onChange={() => setSelectedTableId(t._id)}
                />
                Table {t.tableNumber} (seats {t.capacity})
              </label>
            ))}
          </div>
          <button className="btn btn-primary" onClick={handleBook} disabled={submitting}>
            {submitting ? 'Booking...' : 'Confirm Reservation'}
          </button>
        </div>
      )}
    </div>
  );
};

export default NewReservation;
