const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  roll:     { type: String, required: true, unique: true, uppercase: true, trim: true },
  branch:   { type: String, required: true },
  year:     { type: String, required: true },
  password: { type: String, required: true, minlength: 6 },

  /* ── Stats ── */
  totalLaps: { type: Number, default: 0 },
  totalKm:   { type: Number, default: 0 },
  bestDay:   { type: Number, default: 0 },   // most laps in a single day
  streak:    { type: Number, default: 0 },   // consecutive days run
  lastRunDate: { type: String, default: null }, // 'YYYY-MM-DD'

}, { timestamps: true });

/* Hash password before saving */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

/* Compare password helper */
userSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

/* Never send password in responses */
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);