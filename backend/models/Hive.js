const mongoose = require('mongoose');

const HiveSchema = new mongoose.Schema({
  hive_id: {
    type: String,
    required: [true, 'Please provide a hive ID'],
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: [true, 'Please provide a hive name'],
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  coordinates: {
    lat: Number,
    lng: Number
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  smsAlertsEnabled: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  },
  installDate: {
    type: Date,
    default: Date.now
  },
  lastDataReceived: {
    type: Date
  },
  metadata: {
    colonyAge: String,
    queenType: String,
    notes: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Hive', HiveSchema);
