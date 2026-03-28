/* js/app.js — main controller, connected to backend API */
const App = (() => {

  async function init() {
    // Pill group click handling
    document.querySelectorAll('.pill-group').forEach(group => {
      group.querySelectorAll('.pill').forEach(pill => {
        pill.addEventListener('click', () => {
          group.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
        });
      });
    });

    // Register: update avatar preview live
    const nameInput = document.getElementById('reg-name');
    if (nameInput) {
      nameInput.addEventListener('input', () => {
        const val = nameInput.value.trim();
        document.getElementById('avatar-display').textContent = Data.initials(val) || '??';
      });
    }

    // Check if user already logged in (token + cached user)
    if (API.hasToken()) {
      const user = Storage.getCurrentUser();
      if (user) {
        loadApp(user);
        // Refresh profile from server in background
        try {
          const data = await API.getProfile();
          Storage.setCurrentUser(data.user);
          Storage.setCachedTodayLaps(data.todayLaps || 0);
          refreshHeader(data.user);
        } catch (e) {
          // Token expired — log out
          logout();
        }
        return;
      }
    }
    goTo('splash');
  }

  function goTo(screen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-' + screen).classList.add('active');
  }

  async function register() {
    const name     = document.getElementById('reg-name').value.trim();
    const roll     = document.getElementById('reg-roll').value.trim().toUpperCase();
    const branch   = document.getElementById('reg-branch').value;
    const yearEl   = document.querySelector('#year-group .pill.active');
    const password = document.getElementById('reg-password').value;

    if (!name)     { showToast('Please enter your name'); return; }
    if (!roll)     { showToast('Please enter your roll number'); return; }
    if (!branch)   { showToast('Please select your branch'); return; }
    if (!yearEl)   { showToast('Please select your year'); return; }
    if (!password || password.length < 6) { showToast('Password must be at least 6 characters'); return; }

    const year = yearEl.dataset.val;

    try {
      setLoading('reg-submit', true);
      const data = await API.register({ name, roll, branch, year, password });
      API.saveToken(data.token);
      Storage.setCurrentUser(data.user);
      loadApp(data.user);
      showToast(`Welcome, ${name}! 🏃`);
    } catch (err) {
      showToast(err.message);
    } finally {
      setLoading('reg-submit', false);
    }
  }

  async function login() {
    const roll     = document.getElementById('login-roll').value.trim().toUpperCase();
    const password = document.getElementById('login-password').value;

    if (!roll)     { showToast('Please enter your roll number'); return; }
    if (!password) { showToast('Please enter your password'); return; }

    try {
      setLoading('login-submit', true);
      const data = await API.login({ roll, password });
      API.saveToken(data.token);
      Storage.setCurrentUser(data.user);
      loadApp(data.user);
      showToast(`Welcome back, ${data.user.name}! 🏃`);
    } catch (err) {
      showToast(err.message);
    } finally {
      setLoading('login-submit', false);
    }
  }

  function logout() {
    Storage.clearCurrentUser();
    goTo('splash');
    showToast('Logged out');
  }

  function loadApp(user) {
    goTo('app');
    refreshHeader(user);
    Run.refreshTodayCount();
    Leaderboard.show('daily');
    Stats.refresh();
    switchPage('track');
  }

  function refreshHeader(user) {
    document.getElementById('header-avatar').textContent = Data.initials(user.name);
    document.getElementById('header-name').textContent = user.name;
    document.getElementById('header-meta').textContent = `${user.branch} · ${user.year}${user.year==='1'?'st':user.year==='2'?'nd':user.year==='3'?'rd':'th'} Year`;
    document.getElementById('streak-count').textContent = user.streak || 0;
  }

  function switchPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
    document.getElementById('nav-' + page).classList.add('active');

    if (page === 'leaderboard') Leaderboard.render();
    if (page === 'stats')       Stats.refresh();
    if (page === 'track')       Run.refreshTodayCount();
  }

  function setLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = loading;
    btn.textContent = loading ? 'PLEASE WAIT...' : btn.dataset.label;
  }

  return { init, goTo, register, login, logout, loadApp, refreshHeader, switchPage };
})();

document.addEventListener('DOMContentLoaded', App.init);