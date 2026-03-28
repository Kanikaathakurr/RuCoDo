const express = require('express');
const Run     = require('../models/Run');
const User    = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/* ── GET /api/leaderboard/daily ──────────────────
   Today's leaderboard — sum of valid laps per user today.
   Query: ?date=YYYY-MM-DD (optional, defaults to today)
*/
router.get('/daily', async (req, res) => {
  try {
    const date = req.query.date || todayKey();

    const board = await Run.aggregate([
      // Only valid runs for the requested date
      { $match: { date, isValid: true } },

      // Sum laps per user
      { $group: {
        _id:         '$user',
        roll:        { $first: '$roll' },
        totalLaps:   { $sum: '$laps' },
        totalDistKm: { $sum: '$distanceKm' },
        runCount:    { $sum: 1 },
        bestLapSec:  { $min: '$avgPaceSec' },
      }},

      // Sort by laps descending
      { $sort: { totalLaps: -1 } },

      // Limit to top 50
      { $limit: 50 },

      // Join with User to get name/branch/year
      { $lookup: {
        from:         'users',
        localField:   '_id',
        foreignField: '_id',
        as:           'userInfo',
      }},
      { $unwind: '$userInfo' },

      // Shape the output
      { $project: {
        _id:         0,
        userId:      '$_id',
        name:        '$userInfo.name',
        roll:        '$roll',
        branch:      '$userInfo.branch',
        year:        '$userInfo.year',
        laps:        '$totalLaps',
        distanceKm:  { $round: ['$totalDistKm', 1] },
        runCount:    '$runCount',
        bestLapSec:  '$bestLapSec',
      }},
    ]);

    res.json({ date, board });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── GET /api/leaderboard/alltime ────────────────
   All-time leaderboard — total laps per user ever.
   Query: ?limit=50
*/
router.get('/alltime', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    const board = await User.find({ totalLaps: { $gt: 0 } })
      .sort({ totalLaps: -1 })
      .limit(limit)
      .select('name roll branch year totalLaps totalKm bestDay streak');

    res.json({ board });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── GET /api/leaderboard/my-rank ────────────────
   Returns the logged-in user's rank on both boards.
*/
router.get('/my-rank', protect, async (req, res) => {
  try {
    const date = todayKey();

    // Daily rank
    const dailyBoard = await Run.aggregate([
      { $match: { date, isValid: true } },
      { $group: { _id: '$user', totalLaps: { $sum: '$laps' } } },
      { $sort: { totalLaps: -1 } },
    ]);
    const dailyRank = dailyBoard.findIndex(r => r._id.toString() === req.user._id.toString()) + 1;

    // All-time rank
    const allTimeCount = await User.countDocuments({
      totalLaps: { $gt: req.user.totalLaps },
    });
    const allTimeRank = allTimeCount + 1;

    res.json({
      daily:   { rank: dailyRank || null, date },
      allTime: { rank: allTimeRank },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;