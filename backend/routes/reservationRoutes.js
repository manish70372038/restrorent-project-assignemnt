const express = require('express');
const {
  createReservation,
  getMyReservations,
  cancelMyReservation,
  getAllReservations,
  updateReservation,
  adminCancelReservation,
} = require('../controllers/reservationController');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../utils/constants');

const router = express.Router();

router.use(protect);

// Customer routes
router.post('/', createReservation);
router.get('/my', getMyReservations);
router.patch('/:id/cancel', cancelMyReservation);

// Admin routes
router.get('/', authorize(ROLES.ADMIN), getAllReservations);
router.put('/:id', authorize(ROLES.ADMIN), updateReservation);
router.delete('/:id', authorize(ROLES.ADMIN), adminCancelReservation);

module.exports = router;
