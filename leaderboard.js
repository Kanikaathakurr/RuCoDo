/* js/leaderboard.js */
const Leaderboard = (() => {
    let current = 'daily';
  
    function show(type) {
      current = type;
      document.getElementById('lb-daily-btn').classList.toggle('active', type === 'daily');
      document.getElementById('lb-alltime-btn').classList.toggle('active', type === 'alltime');
      render();
    }
  
    function render() {
      const user = Storage.getCurrentUser();
      const board = current === 'daily'
        ? Storage.getDailyBoard()
        : Storage.getAllTimeBoard().map(u => ({ ...u, laps: u.totalLaps || 0 }));
  
      const list = document.getElementById('leaderboard-list');
      const hero = document.getElementById('lb-hero');
  
      if (!board.length) {
        list.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--text-muted);font-size:14px;">No runners yet. Be the first!</div>';
        document.getElementById('lb-hero-name').textContent = '—';
        document.getElementById('lb-hero-laps').textContent = '0 laps';
        document.getElementById('lb-hero-meta').textContent = '—';
        return;
      }
  
      const top = board[0];
      document.getElementById('lb-hero-name').textContent = top.name || '—';
      document.getElementById('lb-hero-laps').textContent = (top.laps || 0) + ' laps';
      document.getElementById('lb-hero-meta').textContent = `${top.branch || ''} · ${top.year ? top.year + (top.year === '1' ? 'st' : top.year === '2' ? 'nd' : top.year === '3' ? 'rd' : 'th') + ' Year' : ''}`;
  
      const RANK_CLASSES = ['r1', 'r2', 'r3'];
      const RANK_LABELS  = ['1', '2', '3'];
  
      list.innerHTML = board.slice(1).map((r, i) => {
        const rank = i + 2;
        const isMe = user && r.roll === user.roll;
        const initials = Data.initials(r.name);
        return `
          <div class="lb-row ${isMe ? 'is-me' : ''}">
            <div class="lb-rank ${RANK_CLASSES[i] || ''}">${RANK_LABELS[i] || rank}</div>
            <div class="lb-avatar">${initials}</div>
            <div class="lb-info">
              <div class="lb-name">${r.name || 'Runner'} ${isMe ? '<span style="color:var(--green);font-size:11px;">· You</span>' : ''}</div>
              <div class="lb-sub">${r.branch || ''} · ${r.year ? r.year + (r.year==='1'?'st':r.year==='2'?'nd':r.year==='3'?'rd':'th')+' Year' : ''}</div>
            </div>
            <div class="lb-laps">
              <div class="lb-laps-num">${r.laps || 0}</div>
              <div class="lb-laps-label">LAPS</div>
            </div>
          </div>`;
      }).join('');
    }
  
    return { show, render };
  })();