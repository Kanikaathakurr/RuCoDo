/* js/leaderboard.js — connected to backend API */
const Leaderboard = (() => {
  let current = 'daily';

  function show(type) {
    current = type;
    document.getElementById('lb-daily-btn').classList.toggle('active', type === 'daily');
    document.getElementById('lb-alltime-btn').classList.toggle('active', type === 'alltime');
    render();
  }

  async function render() {
    const user = Storage.getCurrentUser();
    const list = document.getElementById('leaderboard-list');
    const heroName = document.getElementById('lb-hero-name');
    const heroLaps = document.getElementById('lb-hero-laps');
    const heroMeta = document.getElementById('lb-hero-meta');

    list.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--text-muted);font-size:14px;">Loading...</div>';

    try {
      let board = [];
      if (current === 'daily') {
        const data = await API.getDailyBoard();
        board = data.board || [];
      } else {
        const data = await API.getAllTimeBoard();
        board = (data.board || []).map(u => ({ ...u, laps: u.totalLaps || 0 }));
      }

      if (!board.length) {
        heroName.textContent = '—';
        heroLaps.textContent = '0 laps';
        heroMeta.textContent = '—';
        list.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--text-muted);font-size:14px;">No runners yet. Be the first!</div>';
        return;
      }

      const top = board[0];
      heroName.textContent = top.name || '—';
      heroLaps.textContent = (top.laps || 0) + ' laps';
      heroMeta.textContent = (top.branch || '') + ' · ' + (top.year ? top.year + (top.year==='1'?'st':top.year==='2'?'nd':top.year==='3'?'rd':'th') + ' Year' : '');

      const RANK_CLASSES = ['r1', 'r2', 'r3'];

      list.innerHTML = board.slice(1).map((r, i) => {
        const rank = i + 2;
        const isMe = user && r.roll === user.roll;
        const initials = Data.initials(r.name);
        return '<div class="lb-row ' + (isMe ? 'is-me' : '') + '">' +
          '<div class="lb-rank ' + (RANK_CLASSES[i] || '') + '">' + rank + '</div>' +
          '<div class="lb-avatar">' + initials + '</div>' +
          '<div class="lb-info">' +
            '<div class="lb-name">' + (r.name || 'Runner') + (isMe ? ' <span style="color:var(--green);font-size:11px;">· You</span>' : '') + '</div>' +
            '<div class="lb-sub">' + (r.branch || '') + ' · ' + (r.year ? r.year + (r.year==='1'?'st':r.year==='2'?'nd':r.year==='3'?'rd':'th') + ' Year' : '') + '</div>' +
          '</div>' +
          '<div class="lb-laps"><div class="lb-laps-num">' + (r.laps || 0) + '</div><div class="lb-laps-label">LAPS</div></div>' +
          '</div>';
      }).join('');

    } catch (err) {
      list.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--text-muted);font-size:13px;">Could not load leaderboard. Is the backend running?</div>';
    }
  }

  return { show, render };
})();