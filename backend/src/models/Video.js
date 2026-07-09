const mongoose = require('mongoose');

const VideoHistorySchema = new mongoose.Schema({
  views: Number,
  likes: Number,
  comments: Number,
  shares: Number,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const VideoSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.Mixed, // Supports ObjectId (Mongoose) or String (fallback IDs)
    required: true
  },
  url: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: 'Social Media Video'
  },
  thumbnailUrl: {
    type: String,
    default: ''
  },
  platform: {
    type: String,
    required: true,
    enum: ['YouTube', 'Instagram', 'LinkedIn', 'TikTok', 'Facebook', 'Other']
  },
  initialMetrics: {
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 }
  },
  updatedMetrics: {
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 }
  },
  googleSheetId: {
    type: String,
    default: ''
  },
  googleSheetRow: {
    type: Number,
    default: 0
  },
  history: [VideoHistorySchema],
  status: {
    type: String,
    default: 'active',
    enum: ['active', 'paused', 'completed']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Video', VideoSchema);
