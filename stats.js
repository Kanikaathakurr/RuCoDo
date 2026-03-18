/* js/stats.js */
const Stats = (() => {

    function refresh() {
      const user = Storage.getCurrentUser();
      if (!user) return;
  
      const todayLaps = Storage.getDailyLaps(user.roll);
      const totalLaps = user.totalLaps || 0;
  
      // Header
      document.getElementById('stats-avatar').textContent = Data.initials(user.name);
      document.getElementById('stats-name').textContent = user.name || 'Runner';
      document.getElementById('stats-meta').textContent = `${user.branch || ''} · NIT Hamirpur`;
  
      // Tiles
      document.getElementById('st-total').textContent = totalLaps;
      document.getElementById('st-today').textContent = todayLaps;
      document.getElementById('st-best').textContent = user.bestDay || 0;
      document.getElementById('st-streak').textContent = user.streak || 0;
      document.getElementById('st-km').textContent = Data.calcKm(totalLaps);
  
      const board = Storage.getDailyBoard();
      const rank = board.findIndex(r => r.roll === user.roll) + 1;
      document.getElementById('st-rank').textContent = rank > 0 ? '#' + rank : '—';
  
      // Milestone
      const next = Data.getNextMilestone(totalLaps);
      const prev = Data.getPrevMilestone(totalLaps);
      const pct  = Data.getMilestoneProgress(totalLaps);
      document.getElementById('ms-icon').textContent = next.icon;
      document.getElementById('ms-name').textContent = next.name;
      document.getElementById('ms-sub').textContent = `${totalLaps} / ${next.laps} laps`;
      document.getElementById('ms-bar').style.width = pct + '%';
  
      // History
      renderHistory(user);
    }
  
    function renderHistory(user) {
      const list = document.getElementById('history-list');
      const history = user.history || [];
      if (!history.length) {
        list.innerHTML = '<div class="history-empty">No runs recorded yet. Hit the ground!</div>';
        return;
      }
      list.innerHTML = history.map(r => `
        <div class="history-row">
          <div class="history-icon">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="4" r="2" stroke="currentColor" stroke-width="1.5"/>
              <path d="M5 16l2-6-2-3 4-2 3 3 2-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="history-info">
            <div class="history-main">${r.laps} lap${r.laps !== 1 ? 's' : ''} · ${r.km || Data.calcKm(r.laps)} km</div>
            <div class="history-meta">${Data.formatDate(r.date)} · ${Data.formatTime(r.durationSec || 0)}</div>
          </div>
          <div class="history-laps">${r.laps}</div>
        </div>`).join('');
    }
  
    return { refresh };
  })();