const mongoose = require('mongoose');
const { TIME_SLOTS, RESERVATION_STATUS } = require('../utils/constants');

const reservationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    table: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Table',
      required: true,
    },
    date: {
      // Stored as 'YYYY-MM-DD' string to avoid timezone drift when comparing
      // "same day" bookings across different client timezones.
      type: String,
      required: [true, 'Reservation date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
    },
    timeSlot: {
      type: String,
      required: true,
      enum: TIME_SLOTS,
    },
    guests: {
      type: Number,
      required: [true, 'Number of guests is required'],
      min: 1,
    },
    status: {
      type: String,
      enum: Object.values(RESERVATION_STATUS),
      default: RESERVATION_STATUS.CONFIRMED,
    },
  },
  { timestamps: true }
);

// Partial unique index: only one CONFIRMED reservation may exist for a given
// table + date + timeSlot combination. Cancelled reservations are excluded
// from the uniqueness constraint so the slot can be re-booked.
// This is the database-level guarantee against double booking; the
// controller also performs an explicit pre-check for a friendlier error message.
reservationSchema.index(
  { table: 1, date: 1, timeSlot: 1 },
  {
    unique: true,
    partialFilterExpression: { status: RESERVATION_STATUS.CONFIRMED },
  }
);

module.exports = mongoose.model('Reservation', reservationSchema);
