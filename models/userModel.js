const crypto = require('crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: [true, 'A user must have a name'],
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    unique: [true, 'This email already exists'],
    required: [true, 'A user must have an email'],
  },
  password: {
    type: String,
    minlength: 8,
    required: [true, 'Please input a password'],
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      validator: function () {
        return this.passwordConfirm === this.password;
      },
      message: 'password mismatch',
    },
  },
  occupation: String,
  otpCode: { type: String },
  otpCodeExpires: Date,
  phone: {
    type: Number,
    required: [true, 'Please provide your phone number'],
  },
  address: String,
  photo: String,
  status: { type: String, default: 'active' },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 5000;
  next();
});

userSchema.methods.correctPassword = async (password, user) => {
  return await bcrypt.compare(password, user.password);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const passwordChangedTime = parseInt(
      new Date(this.passwordChangedAt).getTime() / 1000
    );
    return passwordChangedTime > JWTTimestamp;
  }
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

userSchema.methods.createOTP = function () {
  const otp = Math.floor(Math.random() * 1000000).toString();

  this.otpCode = crypto.createHash('sha256').update(otp).digest('hex');
  this.otpCodeExpires = Date.now() + 3.5 * 60 * 1000;

  return otp;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
