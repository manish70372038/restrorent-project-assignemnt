const Reservation = require('../models/Reservation');
const Table = require('../models/Table');
const { asyncHandler } = require('../middleware/errorHandler');
const { TIME_SLOTS, RESERVATION_STATUS, ROLES } = require('../utils/constants');

// @desc   Create a reservation (customer)
// @route  POST /api/reservations
// @access Private
const createReservation = asyncHandler(async (req, res) => {
  const { tableId, date, timeSlot, guests } = req.body;

  if (!tableId || !date || !timeSlot || !guests) {
    return res.status(400).json({ message: 'tableId, date, timeSlot and guests are required' });
  }
  if (!TIME_SLOTS.includes(timeSlot)) {
    return res.status(400).json({ message: 'Invalid time slot' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ message: 'date must be in YYYY-MM-DD format' });
  }

  // Disallow booking dates in the past
  const today = new Date().toISOString().slice(0, 10);
  if (date < today) {
    return res.status(400).json({ message: 'Cannot create a reservation for a past date' });
  }

  const guestCount = Number(guests);
  if (Number.isNaN(guestCount) || guestCount < 1) {
    return res.status(400).json({ message: 'guests must be a positive number' });
  }

  const table = await Table.findById(tableId);
  if (!table || !table.isActive) {
    return res.status(404).json({ message: 'Selected table does not exist or is inactive' });
  }

  // Capacity validation
  if (guestCount > table.capacity) {
    return res.status(400).json({
      message: `Table ${table.tableNumber} only seats ${table.capacity} guests`,
    });
  }

  // Explicit pre-check for a friendly error message. The unique partial index
  // on the Reservation model is the authoritative guard against race conditions;
  // this check just avoids a raw duplicate-key error in the common case.
  const conflict = await Reservation.findOne({
    table: tableId,
    date,
    timeSlot,
    status: RESERVATION_STATUS.CONFIRMED,
  });
  if (conflict) {
    return res.status(409).json({
      message: 'This table is already booked for the selected date and time slot',
    });
  }

  const reservation = await Reservation.create({
    user: req.user._id,
    table: tableId,
    date,
    timeSlot,
    guests: guestCount,
  });

  const populated = await reservation.populate('table');
  res.status(201).json({ reservation: populated });
});

// @desc   Get reservations belonging to the logged-in customer
// @route  GET /api/reservations/my
// @access Private
const getMyReservations = asyncHandler(async (req, res) => {
  const reservations = await Reservation.find({ user: req.user._id })
    .populate('table')
    .sort({ date: -1, timeSlot: 1 });
  res.json({ reservations });
});

// @desc   Cancel own reservation (customer)
// @route  PATCH /api/reservations/:id/cancel
// @access Private
const cancelMyReservation = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findById(req.params.id);
  if (!reservation) {
    return res.status(404).json({ message: 'Reservation not found' });
  }
  if (reservation.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'You can only cancel your own reservations' });
  }
  if (reservation.status === RESERVATION_STATUS.CANCELLED) {
    return res.status(400).json({ message: 'Reservation is already cancelled' });
  }
  reservation.status = RESERVATION_STATUS.CANCELLED;
  await reservation.save();
  res.json({ reservation });
});

// ---------- Admin ----------

// @desc   Get all reservations, optional ?date=YYYY-MM-DD filter
// @route  GET /api/reservations
// @access Private/Admin
const getAllReservations = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(req.query.date)) {
      return res.status(400).json({ message: 'date must be in YYYY-MM-DD format' });
    }
    filter.date = req.query.date;
  }
  const reservations = await Reservation.find(filter)
    .populate('table')
    .populate('user', 'name email')
    .sort({ date: -1, timeSlot: 1 });
  res.json({ reservations });
});

// @desc   Admin: update any reservation (date/timeSlot/table/guests/status)
// @route  PUT /api/reservations/:id
// @access Private/Admin
const updateReservation = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findById(req.params.id);
  if (!reservation) {
    return res.status(404).json({ message: 'Reservation not found' });
  }

  const { date, timeSlot, tableId, guests, status } = req.body;

  const newDate = date || reservation.date;
  const newTimeSlot = timeSlot || reservation.timeSlot;
  const newTableId = tableId || reservation.table.toString();
  const newGuests = guests !== undefined ? Number(guests) : reservation.guests;
  const newStatus = status || reservation.status;

  if (timeSlot && !TIME_SLOTS.includes(timeSlot)) {
    return res.status(400).json({ message: 'Invalid time slot' });
  }
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ message: 'date must be in YYYY-MM-DD format' });
  }

  const table = await Table.findById(newTableId);
  if (!table) {
    return res.status(404).json({ message: 'Table not found' });
  }
  if (newGuests > table.capacity) {
    return res.status(400).json({ message: `Table ${table.tableNumber} only seats ${table.capacity} guests` });
  }

  if (newStatus === RESERVATION_STATUS.CONFIRMED) {
    const conflict = await Reservation.findOne({
      _id: { $ne: reservation._id },
      table: newTableId,
      date: newDate,
      timeSlot: newTimeSlot,
      status: RESERVATION_STATUS.CONFIRMED,
    });
    if (conflict) {
      return res.status(409).json({
        message: 'This table is already booked for the selected date and time slot',
      });
    }
  }

  reservation.date = newDate;
  reservation.timeSlot = newTimeSlot;
  reservation.table = newTableId;
  reservation.guests = newGuests;
  reservation.status = newStatus;
  await reservation.save();

  const populated = await reservation.populate('table');
  res.json({ reservation: populated });
});

// @desc   Admin: cancel/delete-cancel any reservation
// @route  DELETE /api/reservations/:id
// @access Private/Admin
const adminCancelReservation = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findById(req.params.id);
  if (!reservation) {
    return res.status(404).json({ message: 'Reservation not found' });
  }
  reservation.status = RESERVATION_STATUS.CANCELLED;
  await reservation.save();
  res.json({ reservation });
});

module.exports = {
  createReservation,
  getMyReservations,
  cancelMyReservation,
  getAllReservations,
  updateReservation,
  adminCancelReservation,
};
