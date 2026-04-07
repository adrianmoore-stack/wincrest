const express = require('express');
const {
  signup,
  login,
  protect,
  updatePassword,
  forgotPassword,
  resetPassword,
  createNewToken,
  logout,
  sendOTP,
  // verifyOTP,
  denyCustomerAccess,
  grantCustomerAccess,
  uploadUserPhoto,
  updateMe,
} = require('../controller/authController');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/logout', logout);
router.post('/forgotPassword', forgotPassword);
router.patch('/resetPassword/:token', resetPassword);
router.get('/otp', protect, sendOTP);
// router.post('/otp', protect, verifyOTP);
router.get('/refresh', createNewToken);
router.patch('/updatePassword', protect, updatePassword);
router.patch('/', grantCustomerAccess);
router.patch('/updateMe', protect, uploadUserPhoto, updateMe);
router.delete('/:id', protect, denyCustomerAccess);

module.exports = router;
