const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    code: { type: String, required: true },
    prefix: { type: String, default: '' },
    firstname: { type: String, default: '' },
    lastname: { type: String, default: '' },
    level: { type: String, enum: ['admin', 'user'], required: true },
    isActive: { type: Boolean, default: true },
    isDel: { type: Boolean, default: false }
  },
  { collection: 'user' }
);

module.exports = mongoose.model('User', UserSchema);
