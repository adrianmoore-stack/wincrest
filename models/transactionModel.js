const mongoose = require('mongoose');
const { v4: uuidV4 } = require('uuid');

const transactionSchema = mongoose.Schema({
  accountType: {
    type: String,
    enum: ['business', 'personal', 'premium'],
    required: [
      true,
      'please specify the account to be debited, (business, personal or premium)',
    ],
  },
  amount: { type: Number, required: [true, 'Please enter amount in figures'] },
  senderAccountNumber: {
    type: Number,
    required: [true, 'missing sender account number'],
  },
  recipientAccountNumber: {
    type: Number,
    required: [true, 'Please add recipient account number'],
  },
  recipientBank: {
    type: String,
    trim: true,
    uppercase: true,
    required: [true, 'please add recipient bank'],
  },
  senderName: String,
  recipientName: {
    type: String,
    trim: true,
    required: [true, 'Please add recicpient name'],
  },
  routingNumber: String,
  status: { type: String, default: 'pending' },
  transferType: String,
  transactionDate: Date,
  transactionType: { type: String, enum: ['credit', 'debit'] },
  userId: String,
  description: { type: String, trim: true },
  transactionId: String,
});

transactionSchema.pre('save', function (next) {
  this.transactionId = `TRF-${uuidV4()}`.toUpperCase();
  this.transactionDate = Date.now();

  next();
});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
