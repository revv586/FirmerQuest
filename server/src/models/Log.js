const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema(
  {
    labnumber: [{ type: String }],
    timestamp: { type: Date, required: true, index: true },
    request: {
      method: { type: String, default: '' },
      endpoint: { type: String, default: '' }
    },
    response: {
      statusCode: { type: String, default: '' },
      message: { type: String, default: '' },
      timeMs: { type: Number, default: 0 }
    },
    action: { type: String, default: '', index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }
  },
  { collection: 'log' }
);

LogSchema.index({ timestamp: -1 });
LogSchema.index({ action: 1 });
LogSchema.index({ 'response.statusCode': 1 });
LogSchema.index({ 'request.method': 1 });
LogSchema.index({ 'request.endpoint': 1 });

module.exports = mongoose.model('Log', LogSchema);
