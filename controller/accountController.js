const Account = require('../models/accountModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.createAccount = catchAsync(async (req, res, next) => {
  const existingAccount = await Account.findOne({ userId: req.user.id });

  if (existingAccount)
    return next(
      new AppError('This customer already has existing accounts', 409)
    );

  const accounts = await Account.create({ ...req.body, userId: req.user.id });

  res.status(201).json({
    status: 'success',
    data: {
      accounts,
    },
  });
});

exports.getAccounts = catchAsync(async (req, res, next) => {
  const accounts = await Account.findOne({ ...req.query });

  if (!accounts)
    return next(new AppError('No accounts found for this customer', 404));

  res.status(200).json({
    status: 'success',
    data: {
      accounts,
    },
  });
});

exports.freezeAccount = catchAsync(async (req, res, next) => {
  const { id, userId } = req.query;

  const account = await Account.findByIdAndUpdate(
    { _id: id, userId },
    { status: 'inactive' }
  );

  if (!account)
    return next(new AppError('No accounts found for this customer', 404));

  res.status(200).json({
    status: 'success',
    data: 'Transactions on this account have been restricted',
  });
});

exports.activateAccount = catchAsync(async (req, res, next) => {
  const { id, userId } = req.query;

  const account = await Account.findByIdAndUpdate(
    { _id: id, userId },
    { status: 'active' }
  );

  if (!account)
    return next(new AppError('No accounts found for this customer', 404));

  res.status(200).json({
    status: 'success',
    data: 'Transactions on this account have been enabled',
  });
});
