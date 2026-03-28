const express      = require('express');
const Run          = require('../models/Run');
const User         = require('../models/User');
const { protect }  = require('../middleware/auth');
const { validateRun } = require('../utils/Gpsvalidator');

const router = express.Router();

/* Helper — today's date string */
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/* ── POST /api/runs ──────────────────────────────
   Save a completed run with GPS trail.
   Body: { laps, durationSec, distanceKm, gpsTrail, splits }
*/
router.post('/', protect, async (req, res) => {
  try {
    const { laps, durationSec, distanceKm, gpsTrail, splits } = req.body;

    if (!laps || laps < 1) {
      return res.status(400).json({ error: 'Must complete at least 1 lap' });
    }

    /* ── Anti-cheat validation ── */
    const validation = validateRun({ laps, durationSec, gpsTrail, splits });

    const run = await Run.create({
      user:        req.user._id,
      roll:        req.user.roll,
      date:        todayKey(),
      laps,
      durationSec,
      distanceKm:  distanceKm || parseFloat((laps * 0.4).toFixed(2)),
      avgPaceSec:  laps > 0 ? Math.round(durationSec / laps) : null,
      gpsTrail:    gpsTrail || [],
      splits:      splits   || [],
      isValid:     validation.valid,
      flagReason:  validation.reason,
    });

    /* ── Update user stats (only if valid) ── */
    if (validation.valid) {
      const user = req.user;

      // Streak logic
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yKey = yesterday.toISOString().slice(0, 10);
      const today = todayKey();

      let newStreak = user.streak || 0;
      if (user.lastRunDate === yKey) {
        newStreak += 1;
      } else if (user.lastRunDate !== today) {
        newStreak = 1;
      }

      // Today's total laps for this user
      const todayRuns = await Run.find({ user: user._id, date: today, isValid: true });
      const todayTotal = todayRuns.reduce((sum, r) => sum + r.laps, 0);

      await User.findByIdAndUpdate(user._id, {
        $inc: { totalLaps: laps, totalKm: run.distanceKm },
        $set: {
          streak: newStreak,
          lastRunDate: today,
          bestDay: Math.max(user.bestDay || 0, todayTotal),
        },
      });
    }

    res.status(201).json({
      message: validation.valid ? 'Run saved!' : 'Run saved but flagged for review',
      run,
      valid: validation.valid,
      flagReason: validation.reason,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── GET /api/runs/history ───────────────────────
   Get the logged-in user's run history (paginated).
   Query: ?page=1&limit=10
*/
router.get('/history', protect, async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;

    const runs = await Run.find({ user: req.user._id, isValid: true })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-gpsTrail'); // exclude heavy trail data from list view

    const total = await Run.countDocuments({ user: req.user._id, isValid: true });

    res.json({ runs, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── GET /api/runs/:id ───────────────────────────
   Get a single run WITH full GPS trail (for Strava-style replay).
*/
router.get('/:id', protect, async (req, res) => {
  try {
    const run = await Run.findById(req.params.id).populate('user', 'name roll branch year');
    if (!run) return res.status(404).json({ error: 'Run not found' });

    // Only the owner can see their full trail
    if (run.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json({ run });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── GET /api/runs/:id/trail ─────────────────────
   Get ONLY the GPS trail array for map replay.
   Lighter payload than the full run object.
*/
router.get('/:id/trail', protect, async (req, res) => {
  try {
    const run = await Run.findById(req.params.id).select('gpsTrail splits laps user');
    if (!run) return res.status(404).json({ error: 'Run not found' });

    if (run.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json({
      trail:  run.gpsTrail,
      splits: run.splits,
      laps:   run.laps,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;