// Fixed set of reservation time slots the restaurant operates.
// Keeping this centralized avoids free-text time entry and simplifies
// overlap detection (a slot is either taken or free — no partial overlaps).
const TIME_SLOTS = [
  '12:00-13:00',
  '13:00-14:00',
  '14:00-15:00',
  '18:00-19:00',
  '19:00-20:00',
  '20:00-21:00',
  '21:00-22:00',
];

const ROLES = {
  CUSTOMER: 'customer',
  ADMIN: 'admin',
};

const RESERVATION_STATUS = {
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
};

module.exports = { TIME_SLOTS, ROLES, RESERVATION_STATUS };
