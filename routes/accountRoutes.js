const express = require('express');
const { protect } = require('../controller/authController');
const {
  activateAccount,
  freezeAccount,
  getAccounts,
  createAccount,
} = require('../controller/accountController');

const router = express.Router();

router
  .route('/')
  .get(protect, getAccounts)
  .post(protect, createAccount)
  .patch(protect, activateAccount)
  .delete(protect, freezeAccount);

module.exports = router;
