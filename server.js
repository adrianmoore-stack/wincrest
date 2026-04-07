const dotenv = require('dotenv');

dotenv.config({ path: '.env' });
const app = require('./app');
const mongoose = require('mongoose');

const url = process.env.DATABASE_URL;
mongoose
  .connect(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('database connect successfully'))
  .catch((err) => console.log(err.message));

const port = process.env.PORT;
app.listen(port, () => console.log(`server is running on port ${port}`));
