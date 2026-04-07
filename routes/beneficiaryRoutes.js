const express = require('express');
const { protect } = require('../controller/authController');

const {
  createBeneficiary,
  getBeneficiary,
  deleteBeneficiary,
} = require('../controller/beneficiaryController');

const router = express.Router();

router.route('/').get(protect, getBeneficiary).post(protect, createBeneficiary);

router.delete('/:id',protect, deleteBeneficiary);

module.exports = router;
