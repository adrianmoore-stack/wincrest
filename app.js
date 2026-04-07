const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const userRouter = require('./routes/userRoutes');
const beneficiaryRouter = require('./routes/beneficiaryRoutes');
const transactionRouter = require('./routes/transactionRoutes');
const accountRouter = require('./routes/accountRoutes');
const globalErrorHandler = require('./controller/errorController');
const AppError = require('./utils/appError');

const app = express();

// app.set('view engine', 'pug')
// app.set('views', path.join(__dirname, 'views'))

app.use(express.static(`${__dirname}/public`));

const corsOptions = {
  origin: ['http://localhost:3000', 'https://winbank-pearl.vercel.app'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(morgan('dev'));

app.get('/', (req, res) => res.send('hello from the server'));

app.use('/api/v1/users', userRouter);
app.use('/api/v1/beneficiaries', beneficiaryRouter);
app.use('/api/v1/transactions', transactionRouter);
app.use('/api/v1/accounts', accountRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
