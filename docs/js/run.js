/* js/run.js — Real GPS tracking, lap detection, backend save */
const Run = (() => {

  let state = {
    running: false,
    startTime: null,
    lapStartTime: null,
    lapsDone: 0,
    lapProgress: 0,
    timerInterval: null,
    animFrame: null,
    lapTimes: [],
    gpsTrail: [],
    splits: [],
    watchId: null,
    lastPos: null,
    distanceCovered: 0,
    totalDistance: 0,
  };

  const LAP_DISTANCE_M = 400;
  const $ = id => document.getElementById(id);

  function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat/2)**2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function toggle() {
    if (!state.running) start(); else stop();
  }

  function start() {
    if (!navigator.geolocation) {
      showToast('GPS not available on this device');
      return;
    }

    state.running = true;
    state.startTime = Date.now();
    state.lapStartTime = Date.now();
    state.lapsDone = 0;
    state.lapProgress = 0;
    state.lapTimes = [];
    state.gpsTrail = [];
    state.splits = [];
    state.distanceCovered = 0;
    state.totalDistance = 0;
    state.lastPos = null;

    $('run-toggle').classList.add('running');
    $('run-toggle-label').textContent = 'STOP';
    $('run-toggle-icon').innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="5" y="5" width="5" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="5" height="14" rx="1" fill="currentColor"/></svg>';
    $('run-card').classList.add('running');
    $('ring-progress').classList.add('running');
    $('gps-dot').classList.add('active');
    $('gps-text').textContent = 'Acquiring GPS...';
    $('lp-label').textContent = 'Lap 1 in progress';

    MapView.resetTrail();
    updateRing(0, 0);
    state.timerInterval = setInterval(tickTimer, 1000);

    state.watchId = navigator.geolocation.watchPosition(
      onGpsUpdate,
      onGpsError,
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );

    showToast('Run started! Go go go!');
  }

  function onGpsUpdate(pos) {
    if (!state.running) return;
    const { latitude: lat, longitude: lng } = pos.coords;
    const timestamp = Date.now();

    $('gps-text').textContent = 'GPS active · +/-' + Math.round(pos.coords.accuracy) + 'm';
    state.gpsTrail.push({ lat, lng, timestamp });

    /* Update real map */
    MapView.updateRunner(lat, lng);

    if (state.lastPos) {
      const dist = haversine(state.lastPos.lat, state.lastPos.lng, lat, lng);
      state.distanceCovered += dist;
      state.totalDistance += dist;

      const progress = Math.min((state.distanceCovered / LAP_DISTANCE_M) * 100, 100);
      state.lapProgress = progress;

      $('lap-bar-fill').style.width = Math.round(progress) + '%';
      $('lp-pct').textContent = Math.round(progress) + '%';

      if (state.distanceCovered >= LAP_DISTANCE_M) completeLap();
    }

    state.lastPos = { lat, lng };
  }

  function onGpsError(err) {
    console.warn('GPS error:', err.message);
    $('gps-text').textContent = 'GPS signal weak — move to open area';
  }

  function completeLap() {
    state.lapsDone++;
    state.distanceCovered = 0;

    const now = Date.now();
    const lapSec = Math.round((now - state.lapStartTime) / 1000);
    state.lapTimes.push(lapSec);
    state.splits.push({
      lapNumber: state.lapsDone,
      durationSec: lapSec,
      startTime: state.lapStartTime,
      endTime: now,
    });
    state.lapStartTime = now;

    updateRing(state.lapsDone, 0);

    const cached = Storage.getCachedTodayLaps();
    const todayEl = $('today-big');
    todayEl.textContent = cached + state.lapsDone;
    todayEl.classList.remove('flash');
    void todayEl.offsetWidth;
    todayEl.classList.add('flash');

    $('ring-lap-num').textContent = state.lapsDone;
    $('lp-label').textContent = 'Lap ' + (state.lapsDone + 1) + ' in progress';

    renderSplits();
    showToast('Lap ' + state.lapsDone + ' done! ' + (lapSec < 120 ? 'Great pace!' : 'Keep going!'));
  }

  async function stop() {
    if (!state.running) return;
    state.running = false;

    clearInterval(state.timerInterval);
    cancelAnimationFrame(state.animFrame);

    if (state.watchId !== null) {
      navigator.geolocation.clearWatch(state.watchId);
      state.watchId = null;
    }

    const elapsed = Math.round((Date.now() - state.startTime) / 1000);

    $('run-toggle').classList.remove('running');
    $('run-toggle-label').textContent = 'START';
    $('run-toggle-icon').innerHTML = '<svg width="28" height="28" viewBox="0 0 28 28" fill="none"><polygon points="10,6 22,14 10,22" fill="currentColor"/></svg>';
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

    if (state.lapsDone < 1) {
      showToast('No laps completed — run not saved');
      return;
    }

    showToast('Saving run...');
    try {
      const distanceKm = parseFloat((state.totalDistance / 1000).toFixed(2));
      const result = await API.saveRun({
        laps: state.lapsDone,
        durationSec: elapsed,
        distanceKm,
        gpsTrail: state.gpsTrail,
        splits: state.splits,
      });

      if (result.valid) {
        showToast(state.lapsDone + ' lap' + (state.lapsDone > 1 ? 's' : '') + ' saved!');
      } else {
        showToast('Run saved but flagged: ' + result.flagReason);
      }

      const profile = await API.getProfile();
      Storage.setCurrentUser(profile.user);
      Storage.setCachedTodayLaps(profile.todayLaps || 0);
      $('today-big').textContent = profile.todayLaps || 0;
      App.refreshHeader(profile.user);
      Stats.refresh();

      /* Strava-style trail replay on real map */
      if (state.gpsTrail.length > 5) {
        MapView.replayTrail(state.gpsTrail);
      }

    } catch (err) {
      showToast('Could not save run: ' + err.message);
    }
  }

  function tickTimer() {
    if (!state.running) return;
    const elapsed = Math.round((Date.now() - state.startTime) / 1000);
    $('rs-time').textContent = Data.formatTime(elapsed);
    $('rs-dist').textContent = (state.totalDistance / 1000).toFixed(2);
    $('rs-cal').textContent  = Data.calcKcal(state.lapsDone);
    if (state.lapsDone > 0) {
      const avgSec = Math.round(elapsed / state.lapsDone);
      $('ring-pace').textContent = Data.formatPace(avgSec);
    }
  }

  function updateRing(laps, progress) {
    const circumference = 440;
    const offset = circumference - ((progress / 100) * circumference);
    $('ring-progress').style.strokeDashoffset = offset.toFixed(1);
    $('ring-lap-num').textContent = laps;
  }

  function renderSplits() {
    const list = $('lap-splits-list');
    const count = $('splits-count');
    if (!state.lapTimes.length) return;
    count.textContent = '(' + state.lapTimes.length + ')';
    const best = Math.min(...state.lapTimes);
    const avg  = Math.round(state.lapTimes.reduce((a, b) => a + b, 0) / state.lapTimes.length);
    list.innerHTML = [...state.lapTimes].reverse().map((t, ri) => {
      const i = state.lapTimes.length - ri;
      let badge = '', badgeClass = 'avg';
      if (t === best && state.lapTimes.length > 1) { badge = 'BEST'; badgeClass = 'best'; }
      else if (t < avg) { badge = 'FAST'; badgeClass = 'good'; }
      return '<div class="split-row"><div class="split-num">' + i + '</div><div class="split-time">' + Data.formatTime(t) + '</div>' + (badge ? '<span class="split-badge ' + badgeClass + '">' + badge + '</span>' : '') + '</div>';
    }).join('');
  }

  async function refreshTodayCount() {
    const cached = Storage.getCachedTodayLaps();
    $('today-big').textContent = cached;
    $('today-rank-label').textContent = 'Loading rank...';

    /* Initialize map when track page loads */
    MapView.init();
    MapView.invalidate();

    try {
      const { daily } = await API.getMyRank();
      $('today-rank-label').textContent = daily.rank
        ? '#' + daily.rank + " on today's board"
        : 'Run to get on the board!';
    } catch (e) {
      $('today-rank-label').textContent = '—';
    }
  }

  return { toggle, refreshTodayCount };
})();