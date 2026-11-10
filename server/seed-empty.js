// Populate a new database only. Never clears existing project records.
require('dotenv').config();
const mongoose = require('mongoose');
const models = require('./models');

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MISSING_MONGODB_URI');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  if (['admin', 'local', 'config'].includes(mongoose.connection.name)) throw new Error('INVALID_APPLICATION_DATABASE');
  for (const model of Object.values(models)) {
    if (await model.exists({})) {
      console.log('Database already contains application data. Nothing was changed.');
      return;
    }
  }
  await require('./seed').run(false);
  console.log('Sample data loaded into the empty database.');
}

main().catch(error => {
  console.error('Seed not completed:', ['MISSING_MONGODB_URI', 'INVALID_APPLICATION_DATABASE'].includes(error.message) ? error.message : error.name);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
