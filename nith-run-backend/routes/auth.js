const express = require('express');
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

/* Helper — generate JWT token */
function generateToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

/* ── POST /api/auth/register ─────────────────────
   Body: { name, roll, branch, year, password }
*/
router.post('/register', async (req, res) => {
  try {
    const { name, roll, branch, year, password } = req.body;

    if (!name || !roll || !branch || !year || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const exists = await User.findOne({ roll: roll.toUpperCase() });
    if (exists) {
      return res.status(409).json({ error: 'Roll number already registered' });
    }

    const user = await User.create({ name, roll: roll.toUpperCase(), branch, year, password });

    res.status(201).json({
      message: 'Registered successfully',
      token: generateToken(user._id),
      user: user.toJSON(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── POST /api/auth/login ────────────────────────
   Body: { roll, password }
*/
router.post('/login', async (req, res) => {
  try {
    const { roll, password } = req.body;
    if (!roll || !password) {
      return res.status(400).json({ error: 'Roll number and password required' });
    }

    const user = await User.findOne({ roll: roll.toUpperCase() });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ error: 'Invalid roll number or password' });
    }

    res.json({
      message: 'Login successful',
      token: generateToken(user._id),
      user: user.toJSON(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── GET /api/auth/me ────────────────────────────
   Returns the currently logged-in user's profile.
*/
router.get('/me', protect, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;