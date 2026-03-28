/* js/storage.js — thin local cache on top of the backend API
   localStorage is used only to cache the current user object
   and today's lap count for instant UI updates.
   All real data lives in MongoDB via the backend.
*/
const Storage = (() => {

  const USER_KEY  = 'nith_user';
  const TODAY_KEY = 'nith_today_laps';

  /* ── Current user (cached locally) ── */
  function getCurrentUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function setCurrentUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function clearCurrentUser() {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TODAY_KEY);
    API.clearToken();
  }

  /* ── Today's lap count (cached for instant display) ── */
  function getCachedTodayLaps() {
    return parseInt(localStorage.getItem(TODAY_KEY) || '0');
  }

  function setCachedTodayLaps(n) {
    localStorage.setItem(TODAY_KEY, String(n));
  }

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  return {
    getCurrentUser,
    setCurrentUser,
    clearCurrentUser,
    getCachedTodayLaps,
    setCachedTodayLaps,
    todayKey,
  };
})();