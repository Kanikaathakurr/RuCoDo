/* js/storage.js — localStorage wrapper */
const Storage = (() => {
    const KEY = 'nith_run_v1';
  
    const defaults = {
      users: {},        // { rollNo: { name, roll, branch, year, totalLaps, bestDay, streak, lastRunDate, history[] } }
      daily: {},        // { 'YYYY-MM-DD': { rollNo: laps } }
      currentUser: null
    };
  
    function load() {
      try {
        const raw = localStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : { ...defaults };
      } catch { return { ...defaults }; }
    }
  
    function save(data) {
      try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { console.warn('Storage full', e); }
    }
  
    function get() { return load(); }
  
    function getUser(roll) {
      const d = load();
      return d.users[roll] || null;
    }
  
    function saveUser(user) {
      const d = load();
      d.users[user.roll] = user;
      save(d);
    }
  
    function setCurrentUser(roll) {
      const d = load();
      d.currentUser = roll;
      save(d);
    }
  
    function getCurrentUser() {
      const d = load();
      return d.currentUser ? d.users[d.currentUser] || null : null;
    }
  
    function todayKey() {
      return new Date().toISOString().slice(0, 10);
    }
  
    function getDailyLaps(roll) {
      const d = load();
      const key = todayKey();
      return (d.daily[key] && d.daily[key][roll]) || 0;
    }
  
    function addLaps(roll, count) {
      const d = load();
      const key = todayKey();
      if (!d.daily[key]) d.daily[key] = {};
      d.daily[key][roll] = (d.daily[key][roll] || 0) + count;
  
      const user = d.users[roll];
      if (user) {
        user.totalLaps = (user.totalLaps || 0) + count;
        const todayTotal = d.daily[key][roll];
        if (todayTotal > (user.bestDay || 0)) user.bestDay = todayTotal;
  
        // Streak logic
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yKey = yesterday.toISOString().slice(0, 10);
        if (user.lastRunDate === yKey || user.lastRunDate === key) {
          if (user.lastRunDate !== key) user.streak = (user.streak || 0) + 1;
        } else {
          user.streak = 1;
        }
        user.lastRunDate = key;
        d.users[roll] = user;
      }
      save(d);
    }
  
    function addRunToHistory(roll, run) {
      const d = load();
      const user = d.users[roll];
      if (!user) return;
      if (!user.history) user.history = [];
      user.history.unshift(run);
      if (user.history.length > 20) user.history.pop();
      d.users[roll] = user;
      save(d);
    }
  
    function getDailyBoard(date) {
      const d = load();
      const key = date || todayKey();
      const dayData = d.daily[key] || {};
      return Object.entries(dayData)
        .map(([roll, laps]) => ({ ...d.users[roll], laps }))
        .filter(u => u.name)
        .sort((a, b) => b.laps - a.laps);
    }
  
    function getAllTimeBoard() {
      const d = load();
      return Object.values(d.users)
        .filter(u => (u.totalLaps || 0) > 0)
        .sort((a, b) => (b.totalLaps || 0) - (a.totalLaps || 0));
    }
  
    // Seed mock data if empty
    function seedIfEmpty() {
      const d = load();
      if (Object.keys(d.users).length > 0) return;
      const mock = [
        { name: 'Aditya Kumar',   roll: '21BCS001', branch: 'CSE', year: '3', totalLaps: 289, bestDay: 14, streak: 5, lastRunDate: todayKey() },
        { name: 'Priya Sharma',   roll: '22BCE002', branch: 'ECE', year: '2', totalLaps: 210, bestDay: 12, streak: 3, lastRunDate: todayKey() },
        { name: 'Rohit Verma',    roll: '20BME003', branch: 'ME',  year: '4', totalLaps: 174, bestDay: 11, streak: 7, lastRunDate: todayKey() },
        { name: 'Sneha Negi',     roll: '23BCI004', branch: 'Civil',year:'1', totalLaps: 98,  bestDay: 9,  streak: 2, lastRunDate: todayKey() },
        { name: 'Arjun Thakur',   roll: '21BEE005', branch: 'EE',  year: '3', totalLaps: 155, bestDay: 10, streak: 4, lastRunDate: todayKey() },
        { name: 'Deepika Saini',  roll: '20BCE006', branch: 'ECE', year: '4', totalLaps: 251, bestDay: 15, streak: 6, lastRunDate: todayKey() },
        { name: 'Mansi Rana',     roll: '22BCS007', branch: 'CSE', year: '2', totalLaps: 67,  bestDay: 8,  streak: 1, lastRunDate: todayKey() },
      ];
      const key = todayKey();
      const dailyLaps = [12, 10, 9, 8, 7, 11, 6];
      mock.forEach((u, i) => { d.users[u.roll] = u; d.daily[key] = d.daily[key] || {}; d.daily[key][u.roll] = dailyLaps[i]; });
      save(d);
    }
  
    return { get, getUser, saveUser, setCurrentUser, getCurrentUser, getDailyLaps, addLaps, addRunToHistory, getDailyBoard, getAllTimeBoard, seedIfEmpty, todayKey };
  })();