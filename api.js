/* js/api.js — all communication with the backend
   Change BASE_URL to your deployed backend URL when you go live.
*/

const API = (() => {

    const BASE_URL = 'http://localhost:5000/api';
  
    /* ── Helper: get stored token ── */
    function getToken() {
      return localStorage.getItem('nith_token');
    }
  
    /* ── Helper: standard headers ── */
    function headers(includeAuth = true) {
      const h = { 'Content-Type': 'application/json' };
      if (includeAuth) {
        const token = getToken();
        if (token) h['Authorization'] = `Bearer ${token}`;
      }
      return h;
    }
  
    /* ── Helper: handle response ── */
    async function handle(res) {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      return data;
    }
  
    /* ════════════════════════════════
       AUTH
    ════════════════════════════════ */
  
    async function register({ name, roll, branch, year, password }) {
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: headers(false),
        body: JSON.stringify({ name, roll, branch, year, password }),
      });
      return handle(res);
    }
  
    async function login({ roll, password }) {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: headers(false),
        body: JSON.stringify({ roll, password }),
      });
      return handle(res);
    }
  
    async function getMe() {
      const res = await fetch(`${BASE_URL}/auth/me`, { headers: headers() });
      return handle(res);
    }
  
    /* ════════════════════════════════
       RUNS
    ════════════════════════════════ */
  
    async function saveRun({ laps, durationSec, distanceKm, gpsTrail, splits }) {
      const res = await fetch(`${BASE_URL}/runs`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ laps, durationSec, distanceKm, gpsTrail, splits }),
      });
      return handle(res);
    }
  
    async function getHistory(page = 1, limit = 10) {
      const res = await fetch(`${BASE_URL}/runs/history?page=${page}&limit=${limit}`, {
        headers: headers(),
      });
      return handle(res);
    }
  
    async function getTrail(runId) {
      const res = await fetch(`${BASE_URL}/runs/${runId}/trail`, {
        headers: headers(),
      });
      return handle(res);
    }
  
    /* ════════════════════════════════
       LEADERBOARD
    ════════════════════════════════ */
  
    async function getDailyBoard(date) {
      const q = date ? `?date=${date}` : '';
      const res = await fetch(`${BASE_URL}/leaderboard/daily${q}`);
      return handle(res);
    }
  
    async function getAllTimeBoard() {
      const res = await fetch(`${BASE_URL}/leaderboard/alltime`);
      return handle(res);
    }
  
    async function getMyRank() {
      const res = await fetch(`${BASE_URL}/leaderboard/my-rank`, {
        headers: headers(),
      });
      return handle(res);
    }
  
    /* ════════════════════════════════
       USERS
    ════════════════════════════════ */
  
    async function getProfile() {
      const res = await fetch(`${BASE_URL}/users/profile`, {
        headers: headers(),
      });
      return handle(res);
    }
  
    /* ── Token helpers ── */
    function saveToken(token) { localStorage.setItem('nith_token', token); }
    function clearToken()     { localStorage.removeItem('nith_token'); }
    function hasToken()       { return !!getToken(); }
  
    return {
      register, login, getMe,
      saveRun, getHistory, getTrail,
      getDailyBoard, getAllTimeBoard, getMyRank,
      getProfile,
      saveToken, clearToken, hasToken,
    };
  })();