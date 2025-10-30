const mongoose = require('mongoose');

const ResetAuditSchema = new mongoose.Schema({
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: false },
  username: { type: String, required: true },
  event: { type: String, enum: ['request', 'reset', 'failed'], required: true },
  ip: { type: String },
  userAgent: { type: String },
  meta: { type: Object },
}, { timestamps: true });

module.exports = mongoose.model('ResetAudit', ResetAuditSchema);