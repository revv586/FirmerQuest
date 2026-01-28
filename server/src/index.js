const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');
const { connectDb } = require('./config/db');

const port = process.env.PORT || 4000;

connectDb(process.env.MONGODB_URI)
  .then(() => {
    app.listen(port, () => {
      console.log(`API running on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
