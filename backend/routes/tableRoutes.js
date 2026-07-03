const express = require('express');
const {
  getTables,
  getAvailableTables,
  createTable,
  updateTable,
  deleteTable,
} = require('../controllers/tableController');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../utils/constants');

const router = express.Router();

router.use(protect);

router.get('/', getTables);
router.get('/available', getAvailableTables);

router.post('/', authorize(ROLES.ADMIN), createTable);
router.put('/:id', authorize(ROLES.ADMIN), updateTable);
router.delete('/:id', authorize(ROLES.ADMIN), deleteTable);

module.exports = router;
