/* js/data.js — constants and helpers */
const Data = (() => {
    const LAP_DISTANCE_KM = 0.4;
    const KCAL_PER_LAP = 32; // approximate for ~70kg runner
  
    const MILESTONES = [
      { laps: 10,   icon: '🏃', name: 'First 10 Laps',   label: 'Starter' },
      { laps: 25,   icon: '⚡', name: '25 Lap Club',      label: 'Sprinter' },
      { laps: 50,   icon: '🔥', name: 'Half Century',     label: 'Committed' },
      { laps: 100,  icon: '💯', name: '100 Laps!',        label: 'Centurion' },
      { laps: 250,  icon: '🥈', name: 'Quarter Grand',    label: 'Dedicated' },
      { laps: 500,  icon: '🥇', name: 'Lap Legend',       label: 'Legend' },
      { laps: 1000, icon: '👑', name: 'Grand Master',     label: 'Immortal' },
    ];
  
    function getNextMilestone(totalLaps) {
      return MILESTONES.find(m => m.laps > totalLaps) || MILESTONES[MILESTONES.length - 1];
    }
  
    function getPrevMilestone(totalLaps) {
      const idx = MILESTONES.findIndex(m => m.laps > totalLaps);
      return idx > 0 ? MILESTONES[idx - 1] : { laps: 0 };
    }
  
    function getMilestoneProgress(totalLaps) {
      const next = getNextMilestone(totalLaps);
      const prev = getPrevMilestone(totalLaps);
      const range = next.laps - prev.laps;
      const done  = totalLaps - prev.laps;
      return Math.min(100, Math.round((done / range) * 100));
    }
  
    function initials(name) {
      if (!name) return '??';
      return name.split(' ').map(w => w[0].toUpperCase()).join('').slice(0, 2);
    }
  
    function formatTime(seconds) {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${String(s).padStart(2, '0')}`;
    }
  
    function formatPace(seconds) {
      if (!seconds || seconds <= 0) return '—';
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${String(s).padStart(2, '0')} /lap`;
    }
  
    function calcKm(laps) {
      return (laps * LAP_DISTANCE_KM).toFixed(1);
    }
  
    function calcKcal(laps) {
      return laps * KCAL_PER_LAP;
    }
  
    function rankSuffix(n) {
      if (n === 1) return '1st';
      if (n === 2) return '2nd';
      if (n === 3) return '3rd';
      return `${n}th`;
    }
  
    function formatDate(iso) {
      const d = new Date(iso);
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  
    return { getNextMilestone, getPrevMilestone, getMilestoneProgress, initials, formatTime, formatPace, calcKm, calcKcal, rankSuffix, formatDate, MILESTONES };
  })();