const crypto = require('crypto');
const User = require('../models/userModel');
const Transaction = require('../models/transactionModel');
const Account = require('../models/accountModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

// Debit handler
const debit = async (acc, senderAcc, amount, charges, trans, data) => {
  let dbt;
  const dbtTransfer = acc.accountDetails.find(
    (account) => account.accountNumber === senderAcc
  );

  if (dbtTransfer) {
    dbtTransfer.accountBalance = dbtTransfer.accountBalance - amount - charges;
    dbt = await trans.create(data);
  }

  return { dbtTransfer, dbt };
};

// Credit handler
const credit = async (acc, recAcc, amount, trans, data) => {
  let crdt;
  const crdtTransfer = acc.accountDetails.find(
    (account) => account.accountNumber === recAcc
  );

  if (crdtTransfer) {
    crdtTransfer.accountBalance = crdtTransfer.accountBalance + amount;
    crdt = await trans.create(data);
  }

  return { crdtTransfer, crdt };
};

exports.createTransaction = catchAsync(async (req, res, next) => {
  const {
    recipientAccountNumber,
    senderAccountNumber,
    amount,
    otp,
    charges,
    transferType,
    description,
  } = req.body;

  const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');

  const accounts = await Account.findOne({
    userId: req.user.id,
    status: 'active',
  });

  if (!accounts)
    return next(
      new AppError(
        'An error occurred while trying to complete this transaction, Please contact our support team for assistance',
        404
      )
    );

  const valid = await User.findOne({
    _id: req.user.id,
    otpCode: hashedOTP,
    otpCodeExpires: { $gte: Date.now() },
  });

  if (!valid) {
    return next(
      new AppError(
        'Expired or invalid transaction token, please request for a new token',
        404
      )
    );
  }

  valid.otpCode = undefined;
  valid.otpCodeExpires = undefined;

  valid.save({ validateBeforeSave: false });

  const payee = accounts.accountDetails.find(
    (account) => account.accountNumber === recipientAccountNumber
  );

  const debitTransactions = {
    ...req.body,
    userId: req.user.id,
    status: transferType === 'instant' ? 'successful' : 'pending',
  };

  // Debit the sender
  const { dbtTransfer, dbt } = await debit(
    accounts,
    senderAccountNumber,
    amount,
    charges,
    Transaction,
    debitTransactions
  );

  if (payee) {
    const creditTransactions = {
      status: 'successful',
      recipientName: 'self',
      recipientBank: 'myBank',
      transactionType: 'credit',
      transferType,
      senderAccountNumber,
      recipientAccountNumber,
      userId: req.user.id,
      senderName: 'self',
      accountType: payee.accountType,
      amount,
      description,
    };

    // Credit recipient
    const { crdtTransfer, crdt } = await credit(
      accounts,
      recipientAccountNumber,
      amount,
      Transaction,
      creditTransactions
    );
  }

  await accounts.save();

  try {
    await new Email(req.user, dbt).sendDebit();
  } catch (error) {
    console.log(error);
  }

  res.status(201).json({
    status: 'success',
    data: {
      transactionDetails: dbt,
    },
  });
});

exports.getAllTransactions = catchAsync(async (req, res, next) => {
  const transactions = await Transaction.find({ ...req.query })
    .sort({
      transactionDate: 'desc',
    })
    .limit(20);

  res.status(200).json({
    status: 'success',
    data: {
      transactions,
    },
  });
});

exports.updateTransaction = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  await Transaction.findByIdAndUpdate({ _id: id }, { status: 'successful' });

  res.status(202).json({
    status: 'success',
    message: 'Transaction was updated successfully',
  });
});

exports.otherTransactions = catchAsync(async (req, res, next) => {
  const {
    accountType,
    description,
    transferType,
    amount,
    senderName,
    recipientAccountNumber,
  } = req.body;

  const { id } = req.user;

  const accounts = await Account.findOne({ userId: id, status: 'active' });

  if (!accounts)
    return next(new AppError('Recipient account does not exist', 404));

  const transactionOptions = {
    status: 'successful',
    recipientName: 'self',
    recipientBank: 'myBank',
    transactionType: 'credit',
    senderAccountNumber: '0000000000',
    recipientAccountNumber,
    transferType,
    userId: req.user.id,
    senderName,
    accountType,
    amount,
    description,
  };

  const { crdtTransfer, crdt } = await credit(
    accounts,
    recipientAccountNumber,
    amount,
    Transaction,
    transactionOptions
  );

  await accounts.save();

  res.status(200).json({
    status: 'success',
    data: { transactionDetails: crdt },
  });
});
