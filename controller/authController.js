const crypto = require('crypto');
const { promisify } = require('util');
const multer = require('multer');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const Email = require('../utils/email');
const jwt = require('jsonwebtoken');

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/img');
  },
  filename: (req, file, cb) => {
    const ext = file.mimetype.split('/')[1];
    cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
  },
});

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('This field allows only images', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

// access and refresh token
const signAccessToken = (id) => {
  return jwt.sign({ id }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: '30m', //30m
  });
};

const signRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: '2h',
  });
};

// Save cookie
const saveCookie = (res, token) => {
  const cookieOptions = {
    expires: new Date(Date.now() + 2 * 60 * 60 * 1000),
    httpOnly: true,
    sameSite: 'None',
  };

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  res.cookie('jwt', token, cookieOptions);
};

// signup controller
exports.signup = catchAsync(async (req, res, next) => {
  const {
    name,
    email,
    password,
    passwordConfirm,
    phone,
    address,
    occupation,
    photo,
  } = req.body;
  const existingUser = await User.findOne({ email: email });

  if (existingUser) {
    return next(new AppError('This user already exists', 409));
  }

  const newUser = await User.create({
    name,
    email,
    password,
    passwordConfirm,
    phone,
    address,
    occupation,
    photo,
  });

  const accessToken = signAccessToken(newUser.id);
  const refreshToken = signRefreshToken(newUser.id);
  newUser.password = undefined;
  newUser.status = undefined;

  saveCookie(res, refreshToken);

  res.status(201).json({
    status: 'success',
    accessToken,
    data: {
      user: newUser,
    },
  });
});

// login controller
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password)
    return next(new AppError('Email and password is required', 400));

  const existingUser = await User.findOne({ email }).select('+password');
  if (
    !existingUser ||
    !(await existingUser.correctPassword(password, existingUser))
  )
    return next(new AppError('Incorrect email or password', 404));

  if (existingUser && existingUser?.status === 'inactive') {
    new Email(existingUser).sendDenyAccess();

    return next(
      new AppError(
        'You have been restricted from accessing this account, please contact your bank service support for more information',
        401
      )
    );
  }

  const accessToken = signAccessToken(existingUser.id);
  const refreshToken = signRefreshToken(existingUser.id);

  saveCookie(res, refreshToken);

  existingUser.password = undefined;
  existingUser.status = undefined;

  const url = new Date(Date.now()).toLocaleString('en-US');
  await new Email(existingUser, url).sendLogin();

  res.status(200).json({
    status: 'success',
    accessToken,
    data: {
      user: existingUser,
    },
  });
});

// refresh token route
exports.createNewToken = catchAsync(async (req, res, next) => {
  let refreshToken = req.cookies?.jwt;

  if (!refreshToken)
    return next(new AppError('Token expired, please log in again', 401));

  const { id, iat } = await promisify(jwt.verify)(
    refreshToken,
    process.env.REFRESH_TOKEN_SECRET
  );

  const currentUser = await User.findById(id);
  if (!currentUser)
    return next(new AppError('This user no longer exists', 404));

  // Check if password is modified after jwt
  if (currentUser.changedPasswordAfter(iat))
    return next(
      new AppError('User changed their password, please login again', 401)
    );

  req.user = currentUser;

  const accessToken = signAccessToken(id);
  refreshToken = signRefreshToken(id);

  saveCookie(res, refreshToken);

  res.status(200).json({
    status: 'success',
    accessToken,
    data: {
      user: currentUser,
    },
  });
});

// Protected route
exports.protect = catchAsync(async (req, res, next) => {
  let token;
  if (
    !req.headers?.authorization &&
    !req.headers?.authorization.startsWith('Bearer')
  )
    return next(new AppError("You're forbidden to access this route", 403));

  token = req.headers.authorization.split(' ')[1];

  const { id, iat } = await promisify(jwt.verify)(
    token,
    process.env.ACCESS_TOKEN_SECRET
  ); // {id, iat, exp}

  const currentUser = await User.findById(id);
  if (!currentUser)
    return next(new AppError('This user no longer exists', 401));

  // Check if password is modified after jwt
  if (currentUser.changedPasswordAfter(iat))
    return next(
      new AppError('User changed their password, please login again', 401)
    );

  req.user = currentUser;
  next();
});

// update password controller
exports.updatePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, password, passwordConfirm } = req.body;

  const currentUser = await User.findById(req.user.id).select('+password');

  if (
    !currentUser ||
    !(await currentUser.correctPassword(currentPassword, currentUser))
  )
    return next(new AppError('Invalid user credentials', 403));
  currentUser.password = password;
  currentUser.passwordConfirm = passwordConfirm;

  await currentUser.save();

  const accessToken = signAccessToken(req.user.id);
  const refreshToken = signRefreshToken(req.user.id);

  saveCookie(res, refreshToken);

  res.status(200).json({
    status: 'success',
    message: 'password updated successfully',
    accessToken,
  });
});

// forgot password
exports.forgotPassword = catchAsync(async (req, res, next) => {
  //Get user based on the email
  const { email } = req.body;
  const existingUser = await User.findOne({ email });
  if (!existingUser)
    return next(new AppError('There is no user with this email', 404));

  // 2) Generate the random reset token
  const resetToken = existingUser.createPasswordResetToken();
  await existingUser.save({ validateBeforeSave: false });

  // 3) Send reset token to user's email
  const resetUrl = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetUrl}.\nIf you think this was a mistake, ignore this email.`;

  try {
    await new Email(existingUser, message).sendResetToken();

    res.status(200).json({
      status: 'success',
      message: 'Reset token has been sent to your email',
    });
  } catch (err) {
    existingUser.passwordResetToken = undefined;
    existingUser.passwordResetExpires = undefined;
    await existingUser.save({ validateBeforeSave: false });

    return next(
      new AppError('There was an error sending the email, try again later', 424) // 500
    );
  }
});

// reset password controller
exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const { password, passwordConfirm } = req.body;
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  // 2) if token has not expired and there is a user, set the new password
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user)
    return next(
      new AppError('Invalid or expired token, resend token and try again', 404)
    );

  // 3) update changedPasswordAt property for the user
  user.password = password;
  user.passwordConfirm = passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.passwordChangedAt = Date.now();
  await user.save();

  user.password = undefined;
  // 4) log the user in, send jWT
  const accessToken = signAccessToken(user.id);
  const refreshToken = signRefreshToken(user.id);

  saveCookie(res, refreshToken);

  res.status(200).json({
    status: 'success',
    accessToken,
    data: {
      user,
    },
  });
});

// Logout route

exports.logout = catchAsync(async (req, res) => {
  res.clearCookie('jwt');

  res.status(200).json({
    status: 'success',
    message: 'logged out successfully',
  });
});

// Generate OTP

exports.sendOTP = catchAsync(async (req, res, next) => {
  const { id } = req.user;

  const existingUser = await User.findById(id);

  const OTPcode = existingUser.createOTP();

  const url = OTPcode;

  try {
    await new Email(existingUser, url).sendOTP();
    existingUser.save({ validateBeforeSave: false });

    res.status(200).json({
      status: 'success',
      message: 'Transaction token has been sent to your email',
    });
  } catch (err) {
    existingUser.otpCode = undefined;
    existingUser.otpCodeExpires = undefined;
    await existingUser.save({ validateBeforeSave: false });
    return next(
      new AppError(
        "Sorry, we're unable to generate your transaction token, please try again later",
        424
      ) // 500
    );
  }
});

// exports.verifyOTP = catchAsync(async (req, res, next) => {
//   const { otp } = req.body;

//   const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');

//   const valid = await User.findOne({
//     _id: req.user.id,
//     otpCode: hashedOTP,
//     otpCodeExpires: { $gte: Date.now() },
//   });

//   if (!valid) {
//     return next(
//       new AppError(
//         'Expired or invalid transaction token, please request for a new token',
//         404
//       )
//     );
//   }

//   valid.otpCode = undefined;
//   valid.otpCodeExpires = undefined;

//   valid.save({ validateBeforeSave: false });

//   res.status(200).json({
//     status: 'success',
//     message: 'Transaction token was verified successfully',
//   });
// });

exports.denyCustomerAccess = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const existingUser = await User.findByIdAndUpdate(id, { status: 'inactive' });

  res.status(200).json({
    status: 'success',
    message: 'You no longer have access to this account',
  });
});

exports.grantCustomerAccess = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOneAndUpdate({ email }, { status: 'active' });

  if (!user)
    return next(new AppError('User with this email does not exist', 404));

  user.status = undefined;

  res.status(200).json({
    status: 'success',
    message: 'This account has been granted customer access',
    data: {
      user,
    },
  });
});

exports.uploadUserPhoto = upload.single('photo');

exports.updateMe = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.user.id,
    {
      photo: req.file.filename,
      address: req.body.address,
    },
    { new: true }
  );

  res.status(200).json({
    status: 'success',
    message: 'Your data has been successfully updated',
    data: user,
  });
});
