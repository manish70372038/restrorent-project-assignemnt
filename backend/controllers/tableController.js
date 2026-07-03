const Table = require('../models/Table');
const { asyncHandler } = require('../middleware/errorHandler');
const { TIME_SLOTS } = require('../utils/constants');
const Reservation = require('../models/Reservation');
const { RESERVATION_STATUS } = require('../utils/constants');

// @desc   Get all tables
// @route  GET /api/tables
// @access Private (any authenticated user)
const getTables = asyncHandler(async (req, res) => {
  const tables = await Table.find().sort({ tableNumber: 1 });
  res.json({ tables, timeSlots: TIME_SLOTS });
});

// @desc   Get tables available for a given date/timeSlot/guests
// @route  GET /api/tables/available?date=YYYY-MM-DD&timeSlot=..&guests=2
// @access Private
const getAvailableTables = asyncHandler(async (req, res) => {
  const { date, timeSlot, guests } = req.query;

  if (!date || !timeSlot || !guests) {
    return res.status(400).json({ message: 'date, timeSlot and guests query params are required' });
  }
  if (!TIME_SLOTS.includes(timeSlot)) {
    return res.status(400).json({ message: 'Invalid time slot' });
  }

  const guestCount = Number(guests);
  if (Number.isNaN(guestCount) || guestCount < 1) {
    return res.status(400).json({ message: 'guests must be a positive number' });
  }

  // Tables already booked (confirmed) for this date + timeSlot
  const bookedReservations = await Reservation.find({
    date,
    timeSlot,
    status: RESERVATION_STATUS.CONFIRMED,
  }).select('table');
  const bookedTableIds = bookedReservations.map((r) => r.table.toString());

  const tables = await Table.find({
    isActive: true,
    capacity: { $gte: guestCount },
    _id: { $nin: bookedTableIds },
  }).sort({ capacity: 1 });

  res.json({ tables });
});

// @desc   Create a table
// @route  POST /api/tables
// @access Private/Admin
const createTable = asyncHandler(async (req, res) => {
  const { tableNumber, capacity } = req.body;
  if (!tableNumber || !capacity) {
    return res.status(400).json({ message: 'tableNumber and capacity are required' });
  }
  const table = await Table.create({ tableNumber, capacity });
  res.status(201).json({ table });
});

// @desc   Update a table
// @route  PUT /api/tables/:id
// @access Private/Admin
const updateTable = asyncHandler(async (req, res) => {
  const { capacity, isActive, tableNumber } = req.body;
  const table = await Table.findById(req.params.id);
  if (!table) {
    return res.status(404).json({ message: 'Table not found' });
  }
  if (capacity !== undefined) table.capacity = capacity;
  if (isActive !== undefined) table.isActive = isActive;
  if (tableNumber !== undefined) table.tableNumber = tableNumber;
  await table.save();
  res.json({ table });
});

// @desc   Delete a table
// @route  DELETE /api/tables/:id
// @access Private/Admin
const deleteTable = asyncHandler(async (req, res) => {
  const table = await Table.findById(req.params.id);
  if (!table) {
    return res.status(404).json({ message: 'Table not found' });
  }
  await table.deleteOne();
  res.json({ message: 'Table deleted' });
});

module.exports = { getTables, getAvailableTables, createTable, updateTable, deleteTable };
