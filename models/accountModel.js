const mongoose = require('mongoose');

const accountSchema = mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  createdAt: Date,
  status: { type: String, default: 'active' },
  routingNumber: {
    type: Number,
    required: [true, 'Accounts must have a routing number'],
  },
  accountDetails: [
    {
      accountType: {
        type: String,
        enum: ['business', 'personal', 'premium'],
        required: true,
      },
      accountNumber: Number,
      accountBalance: Number,
      maxCreditLimit: Number,
      minCreditLimit: Number,
      dailyTransactionLimit: Number,
      monthlyFee: Number,
    },
  ],
});

accountSchema.pre('save', function (next) {
  this.createdAt = Date.now();

  next();
});

const Account = mongoose.model('Account', accountSchema);

module.exports = Account;
