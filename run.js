/* js/run.js — GPS tracking, lap detection, run state */
const Run = (() => {

    /* ---- State ---- */
    let state = {
      running: false,
      startTime: null,
      lapStartTime: null,
      lapsDone: 0,
      lapProgress: 0,      // 0–100
      timerInterval: null,
      lapInterval: null,
      animFrame: null,
      angle: 0,            // runner angle on map
      lapTimes: [],        // seconds per lap
      trailPoints: [],
    };
  
    // Ground ellipse for map animation: cx=170, cy=100, rx=148, ry=82
    const MAP = { cx: 170, cy: 100, rx: 148, ry: 82 };
  
    /* ---- DOM refs ---- */
    const $ = id => document.getElementById(id);
  
    function toggle() {
      if (!state.running) start(); else stop();
    }
  
    function start() {
      state.running = true;
      state.startTime = Date.now();
      state.lapStartTime = Date.now();
      state.lapsDone = 0;
      state.lapProgress = 0;
      state.lapTimes = [];
      state.trailPoints = [];
      state.angle = 0;
  
      // UI
      $('run-toggle').classList.add('running');
      $('run-toggle-label').textContent = 'STOP';
      $('run-toggle-icon').innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="5" y="5" width="5" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="5" height="14" rx="1" fill="currentColor"/></svg>`;
      $('run-card').classList.add('running');
      $('ring-progress').classList.add('running');
      $('gps-dot').classList.add('active');
      $('gps-text').textContent = 'GPS tracking active';
      $('lp-label').textContent = 'Lap 1 in progress';
  
      updateRing(0, 0);
      state.timerInterval = setInterval(tickTimer, 1000);
      state.lapInterval = setInterval(tickLapProgress, 600);
      animateRunner();
  
      showToast('Run started! Go go go! 🏃');
    }
  
    function stop() {
      if (!state.running) return;
      state.running = false;
  
      clearInterval(state.timerInterval);
      clearInterval(state.lapInterval);
      cancelAnimationFrame(state.animFrame);
  
      const elapsed = Math.round((Date.now() - state.startTime) / 1000);
      const user = Storage.getCurrentUser();
  
      if (state.lapsDone > 0 && user) {
        Storage.addLaps(user.roll, state.lapsDone);
        Storage.addRunToHistory(user.roll, {
          date: Storage.todayKey(),
          laps: state.lapsDone,
          durationSec: elapsed,
          km: parseFloat(Data.calcKm(state.lapsDone)),
        });
        Stats.refresh();
        showToast(`${state.lapsDone} lap${state.lapsDone > 1 ? 's' : ''} saved! 💪`);
      }
  
      // Reset UI
      $('run-toggle').classList.remove('running');
      $('run-toggle-label').textContent = 'START';
      $('run-toggle-icon').innerHTML = `<svg width="28" height="28" viewBox="0 0 28 28" fill="none"><polygon points="10,6 22,14 10,22" fill="currentColor"/></svg>`;
      $('run-card').classList.remove('running');
      $('ring-progress').classList.remove('running');
      $('gps-dot').classList.remove('active');
      $('gps-text').textContent = 'GPS ready';
      $('rs-time').textContent = '0:00';
      $('rs-dist').textContent = '0.0';
      $('rs-cal').textContent = '0';
      $('ring-pace').textContent = '—';
      $('lp-label').textContent = 'Next lap';
      $('lp-pct').textContent = '0%';
      $('lap-bar-fill').style.width = '0%';
      updateRing(0, 0);
  
      // Reset map trail
      const trail = document.getElementById('map-trail');
      if (trail) trail.setAttribute('d', '');
    }
  
    function tickTimer() {
      if (!state.running) return;
      const elapsed = Math.round((Date.now() - state.startTime) / 1000);
      $('rs-time').textContent = Data.formatTime(elapsed);
      $('rs-dist').textContent = Data.calcKm(state.lapsDone);
      $('rs-cal').textContent = Data.calcKcal(state.lapsDone);
  
      if (state.lapsDone > 0) {
        const avgSec = Math.round(elapsed / state.lapsDone);
        $('ring-pace').textContent = Data.formatPace(avgSec);
      }
    }
  
    function tickLapProgress() {
      if (!state.running) return;
      // Simulate GPS lap progress (replace with real GPS in production)
      const increment = 6 + Math.random() * 10;
      state.lapProgress = Math.min(state.lapProgress + increment, 100);
  
      $('lap-bar-fill').style.width = Math.round(state.lapProgress) + '%';
      $('lp-pct').textContent = Math.round(state.lapProgress) + '%';
  
      if (state.lapProgress >= 100) {
        completeLap();
      }
    }
  
    function completeLap() {
      state.lapsDone++;
      state.lapProgress = 0;
  
      // Record split time
      const now = Date.now();
      const lapSec = Math.round((now - state.lapStartTime) / 1000);
      state.lapTimes.push(lapSec);
      state.lapStartTime = now;
  
      // Update ring
      updateRing(state.lapsDone, 0);
  
      // Update today count
      const todayEl = $('today-big');
      const user = Storage.getCurrentUser();
      const prevToday = user ? Storage.getDailyLaps(user.roll) : 0;
      todayEl.textContent = prevToday + state.lapsDone;
      todayEl.classList.remove('flash');
      void todayEl.offsetWidth;
      todayEl.classList.add('flash');
  
      // Lap label
      $('ring-lap-num').textContent = state.lapsDone;
      $('lp-label').textContent = `Lap ${state.lapsDone + 1} in progress`;
  
      renderSplits();
      showToast(`Lap ${state.lapsDone} done! ${lapSec < 90 ? '⚡ Great pace!' : '💪 Keep going!'}`);
    }
  
    function updateRing(laps, progress) {
      const circumference = 440;
      const filled = (progress / 100) * (circumference / 10);
      // Ring shows progress of current lap (mod)
      const offset = circumference - ((progress / 100) * circumference);
      $('ring-progress').style.strokeDashoffset = offset.toFixed(1);
      $('ring-lap-num').textContent = laps;
    }
  
    function animateRunner() {
      if (!state.running) return;
      state.angle -= 0.018; // counterclockwise direction
  
      const x = MAP.cx + MAP.rx * Math.cos(state.angle);
      const y = MAP.cy + MAP.ry * Math.sin(state.angle);
  
      const dot = document.getElementById('map-runner');
      const pulse = document.getElementById('map-runner-pulse');
      if (dot) { dot.setAttribute('cx', x.toFixed(2)); dot.setAttribute('cy', y.toFixed(2)); }
      if (pulse) { pulse.setAttribute('cx', x.toFixed(2)); pulse.setAttribute('cy', y.toFixed(2)); }
  
      // Trail
      state.trailPoints.push([x, y]);
      if (state.trailPoints.length > 60) state.trailPoints.shift();
      const trail = document.getElementById('map-trail');
      if (trail && state.trailPoints.length > 1) {
        const d = 'M ' + state.trailPoints.map(p => p.join(',')).join(' L ');
        trail.setAttribute('d', d);
      }
  
      state.animFrame = requestAnimationFrame(animateRunner);
    }
  
    function renderSplits() {
      const list = $('lap-splits-list');
      const count = $('splits-count');
      if (!state.lapTimes.length) return;
  
      count.textContent = `(${state.lapTimes.length})`;
      const best = Math.min(...state.lapTimes);
      const avg = Math.round(state.lapTimes.reduce((a, b) => a + b, 0) / state.lapTimes.length);
  
      list.innerHTML = [...state.lapTimes].reverse().map((t, ri) => {
        const i = state.lapTimes.length - ri;
        let badge = '', badgeClass = 'avg';
        if (t === best && state.lapTimes.length > 1) { badge = 'BEST'; badgeClass = 'best'; }
        else if (t < avg) { badge = 'FAST'; badgeClass = 'good'; }
        return `
          <div class="split-row">
            <div class="split-num">${i}</div>
            <div class="split-time">${Data.formatTime(t)}</div>
            ${badge ? `<span class="split-badge ${badgeClass}">${badge}</span>` : ''}
          </div>`;
      }).join('');
    }
  
    function refreshTodayCount() {
      const user = Storage.getCurrentUser();
      if (!user) return;
      const laps = Storage.getDailyLaps(user.roll);
      $('today-big').textContent = laps;
      // Show today's rank
      const board = Storage.getDailyBoard();
      const rank = board.findIndex(r => r.roll === user.roll) + 1;
      $('today-rank-label').textContent = rank > 0 ? `#${rank} on today's board` : 'Run to get on the board!';
    }
  
    return { toggle, start, stop, refreshTodayCount };
  })();
  
  function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 2500);
  }