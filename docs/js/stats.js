/* js/stats.js — connected to backend API */
const Stats = (() => {

  async function refresh() {
    const user = Storage.getCurrentUser();
    if (!user) return;

    document.getElementById('stats-avatar').textContent = Data.initials(user.name);
    document.getElementById('stats-name').textContent   = user.name || 'Runner';
    document.getElementById('stats-meta').textContent   = (user.branch || '') + ' · NIT Hamirpur';

    const todayLaps = Storage.getCachedTodayLaps();
    document.getElementById('st-today').textContent  = todayLaps;
    document.getElementById('st-total').textContent  = user.totalLaps || 0;
    document.getElementById('st-best').textContent   = user.bestDay  || 0;
    document.getElementById('st-streak').textContent = user.streak   || 0;
    document.getElementById('st-km').textContent     = Data.calcKm(user.totalLaps || 0);

    // Fetch fresh data from backend
    try {
      const data = await API.getProfile();
      const u = data.user;
      Storage.setCurrentUser(u);
      Storage.setCachedTodayLaps(data.todayLaps || 0);

      document.getElementById('st-today').textContent  = data.todayLaps || 0;
      document.getElementById('st-total').textContent  = u.totalLaps || 0;
      document.getElementById('st-best').textContent   = u.bestDay   || 0;
      document.getElementById('st-streak').textContent = u.streak    || 0;
      document.getElementById('st-km').textContent     = Data.calcKm(u.totalLaps || 0);

      // Rank
      const rankData = await API.getMyRank();
      document.getElementById('st-rank').textContent = rankData.daily.rank ? '#' + rankData.daily.rank : '—';

      // Milestone
      const total = u.totalLaps || 0;
      const next  = Data.getNextMilestone(total);
      const pct   = Data.getMilestoneProgress(total);
      document.getElementById('ms-icon').textContent = next.icon;
      document.getElementById('ms-name').textContent = next.name;
      document.getElementById('ms-sub').textContent  = total + ' / ' + next.laps + ' laps';
      document.getElementById('ms-bar').style.width  = pct + '%';

      // History
      const histData = await API.getHistory(1, 10);
      renderHistory(histData.runs || []);

    } catch (err) {
      console.warn('Stats refresh failed:', err.message);
      renderHistory([]);
    }
  }

  function renderHistory(runs) {
    const list = document.getElementById('history-list');
    if (!runs.length) {
      list.innerHTML = '<div class="history-empty">No runs recorded yet. Hit the ground!</div>';
      return;
    }
    list.innerHTML = runs.map(r => {
      return '<div class="history-row">' +
        '<div class="history-icon"><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="4" r="2" stroke="currentColor" stroke-width="1.5"/><path d="M5 16l2-6-2-3 4-2 3 3 2-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></div>' +
        '<div class="history-info">' +
          '<div class="history-main">' + r.laps + ' lap' + (r.laps !== 1 ? 's' : '') + ' · ' + r.distanceKm + ' km</div>' +
          '<div class="history-meta">' + Data.formatDate(r.date) + ' · ' + Data.formatTime(r.durationSec || 0) + '</div>' +
        '</div>' +
        '<div class="history-laps">' + r.laps + '</div>' +
        '</div>';
    }).join('');
  }

  return { refresh };
})();