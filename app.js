/* js/app.js — main controller */
const App = (() => {

    function init() {
      Storage.seedIfEmpty();
  
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
  
      // Check if user already logged in
      const user = Storage.getCurrentUser();
      if (user) {
        loadApp(user);
      } else {
        goTo('splash');
      }
    }
  
    function goTo(screen) {
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      document.getElementById('screen-' + screen).classList.add('active');
    }
  
    function register() {
      const name   = document.getElementById('reg-name').value.trim();
      const roll   = document.getElementById('reg-roll').value.trim().toUpperCase();
      const branch = document.getElementById('reg-branch').value;
      const yearEl = document.querySelector('#year-group .pill.active');
  
      if (!name)   { showToast('Please enter your name'); return; }
      if (!roll)   { showToast('Please enter your roll number'); return; }
      if (!branch) { showToast('Please select your branch'); return; }
      if (!yearEl) { showToast('Please select your year'); return; }
  
      const year = yearEl.dataset.val;
  
      // Check if roll already exists
      if (Storage.getUser(roll)) {
        showToast('Roll number already registered. Sign in instead.');
        return;
      }
  
      const user = { name, roll, branch, year, totalLaps: 0, bestDay: 0, streak: 0, lastRunDate: null, history: [] };
      Storage.saveUser(user);
      Storage.setCurrentUser(roll);
      loadApp(user);
      showToast(`Welcome, ${name}! 🏃`);
    }
  
    function login() {
      const roll = document.getElementById('login-roll').value.trim().toUpperCase();
      if (!roll) { showToast('Please enter your roll number'); return; }
  
      const user = Storage.getUser(roll);
      if (!user) {
        showToast('Roll number not found. Please register first.');
        return;
      }
      Storage.setCurrentUser(roll);
      loadApp(user);
      showToast(`Welcome back, ${user.name}!`);
    }
  
    function loadApp(user) {
      goTo('app');
  
      // Populate header
      document.getElementById('header-avatar').textContent = Data.initials(user.name);
      document.getElementById('header-name').textContent = user.name;
      document.getElementById('header-meta').textContent = `${user.branch} · ${user.year}${user.year==='1'?'st':user.year==='2'?'nd':user.year==='3'?'rd':'th'} Year`;
      document.getElementById('streak-count').textContent = user.streak || 0;
  
      // Initial page loads
      Run.refreshTodayCount();
      Stats.refresh();
      Leaderboard.show('daily');
  
      switchPage('track');
    }
  
    function switchPage(page) {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  
      document.getElementById('page-' + page).classList.add('active');
      document.getElementById('nav-' + page).classList.add('active');
  
      if (page === 'leaderboard') Leaderboard.render();
      if (page === 'stats') Stats.refresh();
      if (page === 'track') Run.refreshTodayCount();
    }
  
    return { init, goTo, register, login, switchPage };
  })();
  
  document.addEventListener('DOMContentLoaded', App.init);