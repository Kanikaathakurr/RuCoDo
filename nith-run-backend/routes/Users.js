const express = require('express');
const User    = require('../models/User');
const Run     = require('../models/Run');
const { protect } = require('../middleware/auth');

const router = express.Router();

/* ── GET /api/users/profile ──────────────────────
   Full profile + stats for the logged-in user.
*/
router.get('/profile', protect, async (req, res) => {
  try {
    const user = req.user;
    const today = new Date().toISOString().slice(0, 10);

    // Today's laps
    const todayRuns = await Run.find({ user: user._id, date: today, isValid: true });
    const todayLaps = todayRuns.reduce((sum, r) => sum + r.laps, 0);

    // Best lap pace ever
    const bestRun = await Run.findOne({ user: user._id, isValid: true, avgPaceSec: { $ne: null } })
      .sort({ avgPaceSec: 1 });

    res.json({
      user,
      todayLaps,
      bestPaceSec: bestRun ? bestRun.avgPaceSec : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── GET /api/users/:roll/public ─────────────────
   Public profile of any user (no auth required).
   Shows name, branch, total laps — no private data.
*/
router.get('/:roll/public', async (req, res) => {
  try {
    const user = await User.findOne({ roll: req.params.roll.toUpperCase() })
      .select('name roll branch year totalLaps totalKm bestDay streak createdAt');

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Recent valid runs (no GPS trail)
    const recentRuns = await Run.find({ user: user._id, isValid: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('date laps durationSec distanceKm avgPaceSec');

    res.json({ user, recentRuns });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;