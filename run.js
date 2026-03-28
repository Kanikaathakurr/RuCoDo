/* js/run.js — Real GPS tracking, lap detection, Strava-style trail, backend save */
const Run = (() => {

  let state = {
    running: false,
    startTime: null,
    lapStartTime: null,
    lapsDone: 0,
    lapProgress: 0,
    timerInterval: null,
    animFrame: null,
    angle: 0,
    lapTimes: [],
    gpsTrail: [],
    splits: [],
    watchId: null,
    lastPos: null,
    distanceCovered: 0,
    totalDistance: 0,
  };

  const LAP_DISTANCE_M = 400;
  const MAP = { cx: 170, cy: 100, rx: 148, ry: 82 };
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

  const BOUNDS = {
    minLat: 31.705213, maxLat: 31.706976,
    minLng: 76.524073, maxLng: 76.525678,
  };

  function gpsToSvg(lat, lng) {
    const x = MAP.cx - MAP.rx + ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * (MAP.rx * 2);
    const y = MAP.cy + MAP.ry - ((lat - BOUNDS.minLat) / (BOUNDS.maxLat - BOUNDS.minLat)) * (MAP.ry * 2);
    return { x: parseFloat(x.toFixed(2)), y: parseFloat(y.toFixed(2)) };
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
    state.angle = 0;

    $('run-toggle').classList.add('running');
    $('run-toggle-label').textContent = 'STOP';
    $('run-toggle-icon').innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="5" y="5" width="5" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="5" height="14" rx="1" fill="currentColor"/></svg>';
    $('run-card').classList.add('running');
    $('ring-progress').classList.add('running');
    $('gps-dot').classList.add('active');
    $('gps-text').textContent = 'Acquiring GPS...';
    $('lp-label').textContent = 'Lap 1 in progress';
    $('map-trail').setAttribute('d', '');

    updateRing(0, 0);
    state.timerInterval = setInterval(tickTimer, 1000);

    state.watchId = navigator.geolocation.watchPosition(
      onGpsUpdate,
      onGpsError,
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );

    animateRunner();
    showToast('Run started! Go go go!');
  }

  function onGpsUpdate(pos) {
    if (!state.running) return;
    const { latitude: lat, longitude: lng } = pos.coords;
    const timestamp = Date.now();

    $('gps-text').textContent = 'GPS active · +/-' + Math.round(pos.coords.accuracy) + 'm';
    state.gpsTrail.push({ lat, lng, timestamp });

    if (state.lastPos) {
      const dist = haversine(state.lastPos.lat, state.lastPos.lng, lat, lng);
      state.distanceCovered += dist;
      state.totalDistance += dist;

      const progress = Math.min((state.distanceCovered / LAP_DISTANCE_M) * 100, 100);
      state.lapProgress = progress;

      $('lap-bar-fill').style.width = Math.round(progress) + '%';
      $('lp-pct').textContent = Math.round(progress) + '%';

      if (state.distanceCovered >= LAP_DISTANCE_M) {
        completeLap();
      }
    }

    state.lastPos = { lat, lng };
    updateMapWithGPS(lat, lng);
  }

  function onGpsError(err) {
    console.warn('GPS error:', err.message);
    $('gps-text').textContent = 'GPS signal weak — move to open area';
  }

  function updateMapWithGPS(lat, lng) {
    const { x, y } = gpsToSvg(lat, lng);
    const dot   = $('map-runner');
    const pulse = $('map-runner-pulse');
    if (dot)   { dot.setAttribute('cx', x);   dot.setAttribute('cy', y); }
    if (pulse) { pulse.setAttribute('cx', x); pulse.setAttribute('cy', y); }

    const trail = $('map-trail');
    if (trail && state.gpsTrail.length > 1) {
      const points = state.gpsTrail.map(p => {
        const sv = gpsToSvg(p.lat, p.lng);
        return sv.x + ',' + sv.y;
      });
      trail.setAttribute('d', 'M ' + points.join(' L '));
    }
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

      if (state.gpsTrail.length > 5 && result.run && result.run._id) {
        showTrailReplay(result.run._id);
      }

    } catch (err) {
      showToast('Could not save run: ' + err.message);
    }
  }

  async function showTrailReplay(runId) {
    try {
      const { trail } = await API.getTrail(runId);
      if (!trail || trail.length < 2) return;

      showToast('Replaying your run trail!');
      const mapTrail = $('map-trail');
      mapTrail.setAttribute('d', '');

      let i = 0;
      const step = () => {
        if (i >= trail.length) return;
        const chunk = trail.slice(0, i + 1);
        const points = chunk.map(p => {
          const sv = gpsToSvg(p.lat, p.lng);
          return sv.x + ',' + sv.y;
        });
        mapTrail.setAttribute('d', 'M ' + points.join(' L '));

        const dot = $('map-runner');
        const sv = gpsToSvg(trail[i].lat, trail[i].lng);
        if (dot) { dot.setAttribute('cx', sv.x); dot.setAttribute('cy', sv.y); }

        i++;
        const delay = i < trail.length
          ? Math.min((trail[i].timestamp - trail[i-1].timestamp) / 20, 80)
          : 0;
        setTimeout(step, delay);
      };
      step();
    } catch (e) {
      console.warn('Trail replay failed:', e.message);
    }
  }

  function animateRunner() {
    if (!state.running) return;
    if (!state.lastPos) {
      state.angle -= 0.018;
      const x = MAP.cx + MAP.rx * Math.cos(state.angle);
      const y = MAP.cy + MAP.ry * Math.sin(state.angle);
      const dot = $('map-runner');
      if (dot) { dot.setAttribute('cx', x.toFixed(2)); dot.setAttribute('cy', y.toFixed(2)); }
    }
    state.animFrame = requestAnimationFrame(animateRunner);
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
    try {
      const { daily } = await API.getMyRank();
      $('today-rank-label').textContent = daily.rank
        ? '#' + daily.rank + " on today's board"
        : 'Run to get on the board!';
    } catch (e) {
      $('today-rank-label').textContent = '—';
    }
  }

  return { toggle, refreshTodayCount, showTrailReplay };
})();