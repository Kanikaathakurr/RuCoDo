const mongoose = require('mongoose');

/* A single GPS coordinate point */
const pointSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  timestamp: { type: Number, required: true }, // Unix ms — for trail replay speed
}, { _id: false });

/* A single lap split */
const splitSchema = new mongoose.Schema({
  lapNumber:   { type: Number, required: true },
  durationSec: { type: Number, required: true }, // how long this lap took
  startTime:   { type: Number, required: true }, // Unix ms
  endTime:     { type: Number, required: true },
}, { _id: false });

const runSchema = new mongoose.Schema({
  user:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  roll:   { type: String, required: true }, // denormalized for fast leaderboard queries
  date:   { type: String, required: true }, // 'YYYY-MM-DD' — for daily grouping

  /* ── Core stats ── */
  laps:        { type: Number, required: true, min: 0 },
  durationSec: { type: Number, required: true },
  distanceKm:  { type: Number, required: true },
  avgPaceSec:  { type: Number, default: null }, // seconds per lap

  /* ── GPS Trail (Strava-style) ── */
  // Array of {lat, lng, timestamp} — used to replay the route on map
  gpsTrail: [pointSchema],

  /* ── Lap splits ── */
  splits: [splitSchema],

  /* ── Anti-cheat flags ── */
  isValid:      { type: Boolean, default: true },
  flagReason:   { type: String,  default: null },

}, { timestamps: true });

/* Index for fast leaderboard queries */
runSchema.index({ date: 1, laps: -1 });
runSchema.index({ user: 1, date: 1 });
runSchema.index({ roll: 1 });

module.exports = mongoose.model('Run', runSchema);