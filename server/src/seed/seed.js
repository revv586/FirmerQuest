const fs = require('fs/promises');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

const User = require('../models/User');
const Log = require('../models/Log');

dotenv.config();

const DEFAULT_USERS_PATH = path.resolve(__dirname, '../../seed-data/users.json');
const DEFAULT_LOGS_PATH = path.resolve(__dirname, '../../seed-data/logs.json');

const toObjectId = (value) => {
  if (!value) return undefined;
  if (value.$oid) return new mongoose.Types.ObjectId(value.$oid);
  if (typeof value === 'string') return new mongoose.Types.ObjectId(value);
  return value;
};

const toDate = (value) => {
  if (!value) return undefined;
  if (value.$date) return new Date(value.$date);
  if (typeof value === 'string') return new Date(value);
  return value;
};

const readJsonArray = async (filePath) => {
  const raw = await fs.readFile(filePath, 'utf-8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) {
    throw new Error(`Expected JSON array in ${filePath}`);
  }
  return data;
};

const normalizeUser = (raw) => ({
  _id: toObjectId(raw._id),
  username: raw.username,
  password: raw.password,
  code: raw.code,
  prefix: raw.prefix,
  firstname: raw.firstname,
  lastname: raw.lastname,
  level: raw.level,
  isActive: raw.isActive,
  isDel: raw.isDel
});

const normalizeLog = (raw) => {
  const labnumber = Array.isArray(raw.labnumber)
    ? raw.labnumber
    : raw.labnumber
      ? [raw.labnumber]
      : [];

  return {
    _id: toObjectId(raw._id),
    labnumber,
    timestamp: toDate(raw.timestamp),
    request: {
      method: raw.request?.method || '',
      endpoint: raw.request?.endpoint || ''
    },
    response: {
      statusCode: raw.response?.statusCode || '',
      message: raw.response?.message || '',
      timeMs: raw.response?.timeMs ?? 0
    },
    action: raw.action || '',
    userId: toObjectId(raw.userId)
  };
};

const seed = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/intern_quest';
  const usersPath = process.env.SEED_USERS_PATH || DEFAULT_USERS_PATH;
  const logsPath = process.env.SEED_LOGS_PATH || DEFAULT_LOGS_PATH;
  const shouldReset = process.env.SEED_RESET === 'true';

  await mongoose.connect(uri);

  try {
    const usersRaw = await readJsonArray(usersPath);
    const logsRaw = await readJsonArray(logsPath);

    if (shouldReset) {
      await User.deleteMany({});
      await Log.deleteMany({});
    }

    const users = usersRaw.map(normalizeUser);
    const logs = logsRaw.map(normalizeLog);

    await User.insertMany(users, { ordered: false });
    await Log.insertMany(logs, { ordered: false });

    const userCount = await User.countDocuments();
    const logCount = await Log.countDocuments();

    console.log(`Seed complete. Users: ${userCount}, Logs: ${logCount}`);
  } finally {
    await mongoose.disconnect();
  }
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
