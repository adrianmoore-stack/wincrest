const express = require('express');
const {
  createTransaction,
  getAllTransactions,
  updateTransaction,
  otherTransactions,
} = require('../controller/transactionController');
const { protect } = require('../controller/authController');

const router = express.Router();
router
  .route('/')
  .post(protect, createTransaction)
  .get(protect, getAllTransactions);

router.post('/external', protect, otherTransactions);
router.patch('/:id', protect, updateTransaction);

module.exports = router;
