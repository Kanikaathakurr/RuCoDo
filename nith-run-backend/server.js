const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const dotenv     = require('dotenv');

dotenv.config();

const app = express();

/* ── Middleware ────────────────────────────────── */
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json({ limit: '2mb' })); // GPS traces can be large

/* ── Routes ────────────────────────────────────── */
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/runs',        require('./routes/Runs'));
app.use('/api/leaderboard', require('./routes/Leaderboard'));
app.use('/api/users',       require('./routes/Users'));

/* ── Health check ──────────────────────────────── */
app.get('/', (req, res) => {
  res.json({ status: 'NIT Hamirpur Run API is live 🏃' });
});

/* ── 404 handler ───────────────────────────────── */
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

/* ── Global error handler ──────────────────────── */
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong', message: err.message });
});

/* ── Connect DB & Start ────────────────────────── */
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });