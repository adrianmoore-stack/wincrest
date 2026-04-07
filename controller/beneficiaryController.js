const Beneficiary = require('../models/beneficiaryModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// Create beneficiary
exports.createBeneficiary = catchAsync(async (req, res, next) => {
  const {
    name,
    nickName,
    accountNumber,
    routingNumber,
    bankName,
    swiftCode,
    bankCountry,
    bankState,
    bankCity,
    bankAddress,
    transferType,
  } = req.body;
  const existingBeneficiary = await Beneficiary.findOne({
    accountNumber: accountNumber,
    userId: req.user.id,
    bankName: bankName,
  }).exec();

  console.log(req.user.id);

  if (existingBeneficiary)
    return next(new AppError('This payee already exists', 409));

  const beneficiary = await Beneficiary.create({
    name,
    nickName,
    accountNumber,
    routingNumber,
    bankName,
    swiftCode,
    bankCountry,
    bankState,
    bankCity,
    bankAddress,
    transferType,
    userId: req.user.id,
  });

  beneficiary.userId = undefined;

  res.status(201).json({
    status: 'success',
    data: {
      beneficiary,
    },
  });
});

// Get beneficiaries
exports.getBeneficiary = catchAsync(async (req, res, next) => {
  const { userId } = req.query;
  const beneficiaries = await Beneficiary.find({ userId })
    .sort({ createdAt: 'desc' })
    .limit(20);

  res.status(200).json({
    status: 'success',
    data: {
      beneficiaries,
    },
  });
});

// Delete beneficiary
exports.deleteBeneficiary = catchAsync(async (req, res) => {
  const { id } = req.params;

  await Beneficiary.findByIdAndDelete({ _id: id });

  res.status(204).json({
    status: 'success',
    data: {},
  });
});
