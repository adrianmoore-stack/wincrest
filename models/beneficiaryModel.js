const mongoose = require('mongoose');

const BeneficiarySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Payee must have a name'],
  },
  nickName: String,
  accountNumber: {
    type: Number,
    required: [true, 'Payee must have an account number'],
  },
  routingNumber: {
    type: Number,
    required: [true, 'Payee must have a routing number'],
  },
  bankName: {
    type: String,
    uppercase: true,
    required: [true, "Please input the name of the payee's bank"],
  },
  swiftCode: { type: String, uppercase: true },
  bankCountry: String,
  bankState: String,
  bankCity: String,
  bankAddress: {
    type: String,
    required: [true, "Please provide the payee's bank address"],
  },
  transferType: {
    type: String,
    enum: ['wire', 'global', 'instant'],
    required: [true, "transfer type is either 'wire, global or instant' "],
  },
  userId: String,
  createdAt: Date,
});

BeneficiarySchema.pre('save', function (next) {
  this.createdAt = Date.now();

  next();
});

const Beneficiary = mongoose.model('Beneficiary', BeneficiarySchema);
module.exports = Beneficiary;
