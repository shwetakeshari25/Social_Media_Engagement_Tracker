const mongoose = require('mongoose');

const GoogleSheetSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.Mixed, // Supports ObjectId (Mongoose) or String (fallback IDs)
    required: true
  },
  spreadsheetId: {
    type: String,
    required: true
  },
  spreadsheetUrl: {
    type: String,
    required: true
  },
  sheetName: {
    type: String,
    default: 'Sheet1'
  },
  serviceAccountJson: {
    type: String, // Optional Service Account JSON overrides
    default: ''
  },
  lastSynced: {
    type: Date
  },
  status: {
    type: String,
    default: 'connected',
    enum: ['connected', 'syncing', 'error']
  },
  syncFrequency: {
    type: String,
    default: '1h',
    enum: ['10m', '1h', '5h', '24h', 'manual']
  },
  lastError: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('GoogleSheet', GoogleSheetSchema);
