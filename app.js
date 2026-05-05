/* ══════════════════════════════════════════════
   EMBRACING THE JOURNEY WITHIN — APP v2.1
   Chat · Session Booking · Therapist Profile · PDF Reports
   ══════════════════════════════════════════════ */
'use strict';

// ── DATA CONSTANTS ───────────────────────────────────────────────────────────

const MOODS = [
  { emoji:'🤩', label:'Joyful'     },
  { emoji:'😊', label:'Happy'      },
  { emoji:'🥰', label:'Loved'      },
  { emoji:'😌', label:'Calm'       },
  { emoji:'🤔', label:'Reflective' },
  { emoji:'😐', label:'Neutral'    },
  { emoji:'😔', label:'Sad'        },
  { emoji:'😰', label:'Anxious'    },
  { emoji:'😤', label:'Frustrated' },
  { emoji:'😴', label:'Exhausted'  },
];

const AFFIRMATIONS = [
  'I am enough',        'I am strong',          'I am worthy of love',
  'I am capable',       'I am growing',         'I am at peace',
  'I am grateful',      'I am resilient',        'I am healing',
  'I am brave',         'I am choosing joy',     'I am protected',
];

const SELFCARE = [
  { emoji:'💧', label:'Drank enough water'     },
  { emoji:'😴', label:'Got enough sleep'        },
  { emoji:'🚶', label:'Moved my body'           },
  { emoji:'🙏', label:'Prayer / Meditation'     },
  { emoji:'🍎', label:'Ate nourishing food'     },
  { emoji:'💊', label:'Took my medication'      },
  { emoji:'📵', label:'Limited screen time'     },
  { emoji:'🤝', label:'Connected with someone'  },
  { emoji:'🎉', label:'Did something I enjoy'   },
  { emoji:'✏️',  label:'Others', custom: true   },
];

const COPING = [
  'Deep breathing','Exercise','Journaling','Talking to someone',
  'Prayer / Faith','Music','Walk in nature','Rest / Sleep',
  'Creative activity','Mindfulness','Cold water','Gratitude list',
];

const STRESS_MAP = {
  1:{desc:'Barely There',color:'#1B9E5B'}, 2:{desc:'Very Low',color:'#27AE60'},
  3:{desc:'Mild',color:'#78C53C'},         4:{desc:'Manageable',color:'#B5D334'},
  5:{desc:'Moderate',color:'#F0C100'},     6:{desc:'Noticeable',color:'#F59E0B'},
  7:{desc:'High',color:'#F97316'},         8:{desc:'Very High',color:'#EF4444'},
  9:{desc:'Intense',color:'#DC2626'},      10:{desc:'Overwhelming',color:'#991B1B'},
};

const QUOTES = [
  'It may look like everything is over. Hold on. There is light at the end of the tunnel.',
  'You have walked through fire before — and you came out the other side. You will again.',
  'The night is always darkest just before the dawn. Morning is coming.',
  'Even the longest storm must end. Your sky is clearing, even if you can\'t see it yet.',
  'When you feel like giving up, remember why you held on for so long.',
  'What feels like the end is often just a painful, necessary turning point.',
  'You are still here. That alone is proof of your strength.',
  'Rock bottom became the foundation on which I rebuilt my life.',
  'Don\'t give up on yourself. The best chapters are still unwritten.',
  'Some days the bravest thing you can do is simply not quit.',
  'You don\'t have to have it all figured out to move forward.',
  'Your feelings are valid. Your healing is possible.',
  'Progress is progress, no matter how small it seems.',
  'Be gentle with yourself — you are still becoming.',
  'Every storm runs out of rain. This one will too.',
  'You are braver than you believe and stronger than you know.',
  'Taking care of yourself is one of the greatest acts of love.',
  'Breathe. You\'ve survived every hard day so far — that\'s 100%.',
  'Small steps every day lead to extraordinary change.',
  'Rest is productive. Healing is progress.',
  'You are not your thoughts — you are the one who notices them.',
  'You deserve the same compassion you give to others.',
  'Showing up for yourself today is an act of courage.',
  'You are not the same person you were a year ago. That is growth.',
  'Your story is not over. Turn the page.',
  'Pain is not permanent. But the strength you gain from it is.',
  'You were not made to just survive — you were made to flourish.',
  'Don\'t rush your healing. Great things take time.',
  'You are enough. You have always been enough.',
  'Every day you choose to keep going is a victory.',
];

const STEPS = [
  { id:'mood',         emoji:'💭', label:'Mood'      },
  { id:'gratitude',    emoji:'🌿', label:'Gratitude' },
  { id:'affirmations', emoji:'✨', label:'Affirm'    },
  { id:'selfcare',     emoji:'🌟', label:'Self-Care' },
  { id:'stress',       emoji:'🌊', label:'Stress'    },
  { id:'reflection',   emoji:'📝', label:'Reflect'   },
];

// ── STATE ────────────────────────────────────────────────────────────────────

let currentUser   = null;
let authToken     = null;
let today         = {};
let entries       = [];
let selectedMood  = null;
let selAffirms    = new Set();
let checkedSC     = new Set();
let selCoping     = new Set();
let done          = new Set();
let breathTimer   = null;
let weeklyChartInst  = null;
let weeklyReportData = null;   // cached for PDF
let chatPollInterval = null;   // setInterval reference for chat polling

// ── API HELPER ───────────────────────────────────────────────────────────────

const API = {
  base: '/api',
  headers() {
    const h = { 'Content-Type': 'application/json' };
    if (authToken) h['Authorization'] = `Bearer ${authToken}`;
    return h;
  },
  async get(path) {
    const r = await fetch(this.base + path, { headers: this.headers() });
    return r.json();
  },
  async post(path, body) {
    const r = await fetch(this.base + path, { method:'POST', headers: this.headers(), body: JSON.stringify(body) });
    return r.json();
  },
  async patch(path, body) {
    const r = await fetch(this.base + path, { method:'PATCH', headers: this.headers(), body: JSON.stringify(body) });
    return r.json();
  },
  async del(path) {
    const r = await fetch(this.base + path, { method:'DELETE', headers: this.headers() });
    return r.json();
  },
};

// ── AUTH ─────────────────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('jtw_token');
  const user  = localStorage.getItem('jtw_user');
  if (token && user) {
    authToken   = token;
    currentUser = JSON.parse(user);
    showSplash();
  } else {
    showAuthScreen();
  }
});

function showAuthScreen() {
  document.getElementById('authScreen').classList.remove('hidden');
  document.getElementById('splash').style.display = 'none';
}

function showSplash() {
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('splash').style.display = '';
}

function switchAuthTab(tab) {
  document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
  document.getElementById('registerForm').classList.toggle('hidden', tab !== 'register');
  document.getElementById('tabLogin').classList.toggle('active', tab === 'login');
  document.getElementById('tabRegister').classList.toggle('active', tab === 'register');
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  const err = document.getElementById('loginError');
  btn.textContent = 'Signing in…'; btn.disabled = true;
  err.classList.add('hidden');

  const res = await API.post('/auth/login', {
    email:    document.getElementById('loginEmail').value.trim(),
    password: document.getElementById('loginPassword').value,
  });

  if (res.error) {
    err.textContent = res.error; err.classList.remove('hidden');
    btn.textContent = 'Sign In →'; btn.disabled = false;
  } else {
    saveAuth(res.token, res.user);
    showSplash();
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const btn = document.getElementById('registerBtn');
  const err = document.getElementById('registerError');
  btn.textContent = 'Creating…'; btn.disabled = true;
  err.classList.add('hidden');

  const res = await API.post('/auth/register', {
    name:     document.getElementById('regName').value.trim(),
    email:    document.getElementById('regEmail').value.trim(),
    password: document.getElementById('regPassword').value,
  });

  if (res.error) {
    err.textContent = res.error; err.classList.remove('hidden');
    btn.textContent = 'Create Account →'; btn.disabled = false;
  } else {
    saveAuth(res.token, res.user);
    showSplash();
  }
}

function saveAuth(token, user) {
  authToken   = token;
  currentUser = user;
  localStorage.setItem('jtw_token', token);
  localStorage.setItem('jtw_user',  JSON.stringify(user));
}

function logout() {
  authToken = null; currentUser = null;
  localStorage.removeItem('jtw_token');
  localStorage.removeItem('jtw_user');
  localStorage.removeItem('jtw_entries');
  location.reload();
}

// ── BOOT ─────────────────────────────────────────────────────────────────────

function startApp() {
  const splash = document.getElementById('splash');
  splash.style.transition = 'opacity 0.55s ease, transform 0.55s ease';
  splash.style.opacity    = '0';
  splash.style.transform  = 'scale(0.96)';
  setTimeout(() => {
    splash.style.display = 'none';
    document.getElementById('main').classList.remove('hidden');
    init();
  }, 560);
}

async function init() {
  buildMoodGrid(); buildAffirmGrid(); buildSCList(); buildCopingTags();
  await loadEntriesFromServer();
  await restoreToday();
  updateDashboard();
  updateProgress();
  updateNotifBadge();
  startChatBadgePolling();
  // Update user name in menu
  if (currentUser) {
    const el = document.getElementById('menuUserName');
    if (el) el.textContent = `👤 ${currentUser.name}`;
  }
}

// ── NAVIGATION ────────────────────────────────────────────────────────────────

function goTo(id) {
  document.querySelectorAll('.sec').forEach(s => s.classList.remove('active'));
  document.getElementById('sec-' + id).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  const nb = document.querySelector(`.nav-item[data-s="${id}"]`);
  if (nb) nb.classList.add('active');
  closeMenu(); closeNotifPanel();

  if (id === 'history')   renderHistory();
  if (id === 'dashboard') updateDashboard();
  if (id === 'events')    loadEvents();
  if (id === 'bookings')  loadMyBookings();
  if (id === 'insights')  loadInsights();
  if (id === 'sessions')  loadAvailability();
  if (id === 'therapist') loadTherapistProfile();
  if (id === 'chat')      openChat();
}

function advance(sectionId) {
  saveSection(sectionId);
  done.add(sectionId);
  updateProgress();
  syncEntryToServer(false);
  const idx = STEPS.findIndex(s => s.id === sectionId);
  if (idx < STEPS.length - 1) goTo(STEPS[idx + 1].id);
}

function finish() {
  saveSection('reflection');
  done.add('reflection');
  updateProgress();
  today.completed = true;
  today.completedAt = new Date().toISOString();
  syncEntryToServer(true);
  goTo('complete');
  renderSummary();
  fireConfetti();
  // Load daily insight after completion
  setTimeout(loadDailyInsightPopup, 2500);
}

// ── MENU ─────────────────────────────────────────────────────────────────────

function toggleMenu() {
  const menu = document.getElementById('sideMenu');
  const ov   = document.getElementById('menuOverlay');
  menu.classList.contains('open') ? closeMenu() : (menu.classList.add('open'), ov.classList.add('open'));
}
function closeMenu() {
  document.getElementById('sideMenu').classList.remove('open');
  document.getElementById('menuOverlay').classList.remove('open');
}

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────

async function updateNotifBadge() {
  if (!authToken) return;
  const notifs = await API.get('/auth/notifications');
  if (notifs.error) return;
  const unread = notifs.filter(n => !n.read).length;
  const badge  = document.getElementById('notifBadge');
  if (unread > 0) { badge.textContent = unread > 9 ? '9+' : unread; badge.classList.remove('hidden'); }
  else              badge.classList.add('hidden');
}

async function toggleNotifPanel() {
  const panel = document.getElementById('notifPanel');
  const ov    = document.getElementById('notifOverlay');
  if (panel.classList.contains('hidden')) {
    panel.classList.remove('hidden'); ov.classList.add('open');
    await renderNotifList();
  } else {
    closeNotifPanel();
  }
}
function closeNotifPanel() {
  document.getElementById('notifPanel').classList.add('hidden');
  document.getElementById('notifOverlay').classList.remove('open');
}

async function renderNotifList() {
  const list = document.getElementById('notifList');
  const notifs = await API.get('/auth/notifications');
  if (!notifs.length) { list.innerHTML = `<p class="notif-empty">No notifications yet 🌱</p>`; return; }
  list.innerHTML = notifs.map(n => `
    <div class="notif-item ${n.read ? '' : 'unread'}">
      <p class="notif-msg">${n.message}</p>
      <p class="notif-time">${timeAgo(new Date(n.createdAt))}</p>
    </div>
  `).join('');
}

async function markNotifsRead() {
  await API.patch('/auth/notifications/read', {});
  document.getElementById('notifBadge').classList.add('hidden');
  renderNotifList();
}

function timeAgo(date) {
  const mins = Math.floor((Date.now() - date) / 60000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── PROGRESS RING ─────────────────────────────────────────────────────────────

function updateProgress() {
  const pct  = Math.round((done.size / STEPS.length) * 100);
  const circ = 2 * Math.PI * 16;
  document.getElementById('ringFill').style.strokeDasharray = `${(pct/100)*circ} ${circ}`;
  document.getElementById('progPct').textContent = `${pct}%`;
  renderStepsGrid();
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────

function updateDashboard() {
  const hr = new Date().getHours();
  const greet = hr < 12 ? '☀️ Good Morning' : hr < 17 ? '🌤️ Good Afternoon' : '🌙 Good Evening';
  document.getElementById('greeting').textContent = greet + (currentUser ? `, ${currentUser.name.split(' ')[0]}` : '');
  document.getElementById('heroDate').textContent = new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  document.getElementById('quoteText').textContent = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  renderStats();
  renderStepsGrid();
}

function renderStats() {
  const streak = calcStreak();
  const isActive = currentUser?.isActive || false;
  document.getElementById('statsRow').innerHTML = `
    <div class="stat-card">
      <span class="stat-val">🔥 ${streak}</span>
      <span class="stat-lbl">Day Streak</span>
    </div>
    <div class="stat-card ${isActive ? 'active-stat' : ''}">
      <span class="stat-val">${isActive ? '⭐ Active' : `📖 ${entries.length}`}</span>
      <span class="stat-lbl">${isActive ? 'Member' : 'Total Entries'}</span>
    </div>
  `;
}

function calcStreak() {
  if (!entries.length) return 0;
  let streak = 0, check = new Date(); check.setHours(0,0,0,0);
  for (const e of [...entries].sort((a,b) => new Date(b.date)-new Date(a.date))) {
    const d = new Date(e.date); d.setHours(0,0,0,0);
    if (d.getTime() === check.getTime()) { streak++; check.setDate(check.getDate()-1); } else break;
  }
  return streak;
}

function renderStepsGrid() {
  document.getElementById('stepsGrid').innerHTML = STEPS.map(s => `
    <div class="step-card ${done.has(s.id) ? 'done' : ''}" onclick="goTo('${s.id}')">
      <span class="s-ico">${s.emoji}</span>
      <span class="s-lbl">${s.label}</span>
      <span class="s-tick">✓</span>
    </div>
  `).join('');
}

// ── MOOD ──────────────────────────────────────────────────────────────────────

function buildMoodGrid() {
  document.getElementById('moodGrid').innerHTML = MOODS.map((m, i) => `
    <button class="mood-btn" data-i="${i}" onclick="pickMood(${i})">
      <span class="m-ico">${m.emoji}</span>
      <span class="m-lbl">${m.label}</span>
    </button>
  `).join('');
}

function pickMood(i) {
  selectedMood = i;
  document.querySelectorAll('.mood-btn').forEach((b, j) => b.classList.toggle('sel', j === i));
  document.getElementById('moodNoteCard').style.display = 'block';
}

// ── AFFIRMATIONS ──────────────────────────────────────────────────────────────

function buildAffirmGrid() {
  document.getElementById('affirmGrid').innerHTML = AFFIRMATIONS.map((a, i) => `
    <button class="affirm-btn" data-i="${i}" onclick="toggleAffirm(${i})">${a}</button>
  `).join('');
}
function toggleAffirm(i) {
  const btn = document.querySelector(`.affirm-btn[data-i="${i}"]`);
  selAffirms.has(i) ? (selAffirms.delete(i), btn.classList.remove('sel')) : (selAffirms.add(i), btn.classList.add('sel'));
}

// ── SELF-CARE ─────────────────────────────────────────────────────────────────

function buildSCList() {
  document.getElementById('scList').innerHTML = SELFCARE.map((item, i) => `
    <div class="sc-item" data-i="${i}" onclick="toggleSC(${i})">
      <div class="sc-box">✓</div>
      <span class="sc-ico">${item.emoji}</span>
      <span class="sc-txt">${item.label}</span>
    </div>
    ${item.custom ? `<div class="sc-other-wrap" id="scOtherWrap" style="display:none">
      <input class="input-line sc-other-input" id="scOtherInput" type="text"
        placeholder="What else did you do for yourself?" onclick="event.stopPropagation()"/>
    </div>` : ''}
  `).join('');
}

function toggleSC(i) {
  const el = document.querySelector(`.sc-item[data-i="${i}"]`);
  checkedSC.has(i) ? (checkedSC.delete(i), el.classList.remove('checked')) : (checkedSC.add(i), el.classList.add('checked'));
  if (SELFCARE[i].custom) {
    const w = document.getElementById('scOtherWrap');
    if (w) w.style.display = checkedSC.has(i) ? 'block' : 'none';
  }
  refreshSCScore();
}

function refreshSCScore() {
  const n = checkedSC.size, t = SELFCARE.length;
  document.getElementById('scScore').textContent = `${n} / ${t}`;
  document.getElementById('scBar').style.width   = `${(n/t)*100}%`;
  const msgs = ['Every step counts 💚','You\'re caring for yourself 🌱','Keep going — you\'re doing great 🌟','Excellent self-care today! 🏆'];
  document.getElementById('scMsg').textContent = msgs[Math.min(Math.floor((n/t)*msgs.length), msgs.length-1)];
}

// ── STRESS ────────────────────────────────────────────────────────────────────

function buildCopingTags() {
  document.getElementById('copingTags').innerHTML = COPING.map((c, i) => `
    <button class="coping-tag" data-i="${i}" onclick="toggleCoping(${i})">${c}</button>
  `).join('');
}
function toggleCoping(i) {
  const el = document.querySelector(`.coping-tag[data-i="${i}"]`);
  selCoping.has(i) ? (selCoping.delete(i), el.classList.remove('sel')) : (selCoping.add(i), el.classList.add('sel'));
}

function onStress(val) {
  const v = parseInt(val), lvl = STRESS_MAP[v];
  document.getElementById('stressNum').textContent = v;
  document.getElementById('stressNum').style.color = lvl.color;
  document.getElementById('stressLbl').textContent = lvl.desc;
  document.getElementById('breathBox').style.display = v >= 7 ? 'block' : 'none';
}

// ── BREATHING ─────────────────────────────────────────────────────────────────

function setupBreathing() {
  document.getElementById('breathCircle').addEventListener('click', runBreath);
}
function runBreath() {
  if (breathTimer) return;
  const circle = document.getElementById('breathCircle');
  const text   = document.getElementById('breathText');
  const hint   = document.getElementById('breathHint');
  hint.textContent = 'Follow the circle…';
  const phases = [{ cls:'inhale',label:'Inhale…',dur:4000 },{ cls:'hold',label:'Hold…',dur:7000 },{ cls:'exhale',label:'Exhale…',dur:8000 }];
  let p = 0;
  function next() {
    circle.className = 'breath-circle'; void circle.offsetWidth;
    const ph = phases[p % phases.length];
    circle.classList.add(ph.cls); text.textContent = ph.label; p++;
    if (p < phases.length * 3) breathTimer = setTimeout(next, ph.dur);
    else { breathTimer = null; circle.className = 'breath-circle'; text.textContent = 'Well done ✨'; hint.textContent = '4-7-8 breathing reduces anxiety in minutes'; }
  }
  next();
}

// ── WORD COUNT ────────────────────────────────────────────────────────────────

function wordCount(ta, id) {
  const w = ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0;
  document.getElementById(id).textContent = `${w} word${w !== 1 ? 's' : ''}`;
}

// ── SAVE SECTION DATA ─────────────────────────────────────────────────────────

function saveSection(id) {
  switch (id) {
    case 'mood':
      if (selectedMood !== null) { today.mood = { idx: selectedMood, ...MOODS[selectedMood] }; today.moodNote = document.getElementById('moodNote').value.trim(); }
      break;
    case 'gratitude':
      today.gratitude = ['grat1','grat2','grat3'].map(x => document.getElementById(x).value.trim()).filter(Boolean);
      break;
    case 'affirmations':
      today.affirmations = [...selAffirms].map(i => AFFIRMATIONS[i]);
      today.customAffirm = document.getElementById('customAffirm').value.trim();
      break;
    case 'selfcare':
      today.selfcare      = [...checkedSC].map(i => SELFCARE[i]);
      today.selfcareCount = checkedSC.size;
      today.scOther       = (document.getElementById('scOtherInput') || {}).value || '';
      break;
    case 'stress':
      today.stressLevel   = parseInt(document.getElementById('stressSlider').value);
      today.stressSource  = document.getElementById('stressSource').value.trim();
      today.copingMethods = [...selCoping].map(i => COPING[i]);
      today.copingNote    = document.getElementById('copingNote').value.trim();
      today.afterCoping   = document.getElementById('afterCoping').value.trim();
      break;
    case 'reflection':
      today.keyLesson = document.getElementById('keyLesson').value.trim();
      today.intention = document.getElementById('intention').value.trim();
      today.dayWord   = document.getElementById('dayWord').value.trim();
      break;
  }
}

// ── SERVER SYNC ───────────────────────────────────────────────────────────────

async function syncEntryToServer(completed = false) {
  if (!authToken) return;
  const payload = { ...today, completed };
  try {
    const saved = await API.post('/entries', payload);
    if (!saved.error) {
      // Update local cache
      const todayStr = new Date().toDateString();
      entries = entries.filter(e => new Date(e.date).toDateString() !== todayStr);
      entries.unshift(saved);
      localStorage.setItem('jtw_entries', JSON.stringify(entries));
      // Refresh user's active status
      if (completed) {
        const me = await API.get('/auth/me');
        if (!me.error) { currentUser = me; localStorage.setItem('jtw_user', JSON.stringify(me)); updateNotifBadge(); }
      }
    }
  } catch (e) { console.warn('Sync failed, entry cached locally'); }
}

async function loadEntriesFromServer() {
  if (!authToken) { loadLocalEntries(); return; }
  try {
    const data = await API.get('/entries');
    if (Array.isArray(data)) { entries = data; localStorage.setItem('jtw_entries', JSON.stringify(entries)); }
    else loadLocalEntries();
  } catch { loadLocalEntries(); }
}
function loadLocalEntries() {
  try { entries = JSON.parse(localStorage.getItem('jtw_entries') || '[]'); } catch { entries = []; }
}

async function restoreToday() {
  const todayStr = new Date().toISOString().split('T')[0];
  let existing;
  if (authToken) {
    const res = await API.get('/entries/today');
    existing = res?._id ? res : null;
  } else {
    existing = entries.find(e => new Date(e.date).toDateString() === new Date().toDateString());
  }

  if (!existing) { setupBreathing(); return; }
  today = existing;

  if (today.mood !== undefined)    { pickMood(today.mood.idx); if (today.moodNote) document.getElementById('moodNote').value = today.moodNote; done.add('mood'); }
  if (today.gratitude?.length)     { ['grat1','grat2','grat3'].forEach((id,i) => { if (today.gratitude[i]) document.getElementById(id).value = today.gratitude[i]; }); done.add('gratitude'); }
  if (today.affirmations)          { today.affirmations.forEach(a => { const i = AFFIRMATIONS.indexOf(a); if (i>=0) toggleAffirm(i); }); if (today.customAffirm) document.getElementById('customAffirm').value = today.customAffirm; if (today.affirmations.length || today.customAffirm) done.add('affirmations'); }
  if (today.selfcare)              { today.selfcare.forEach(item => { const i = SELFCARE.findIndex(s => s.label === item.label); if (i>=0) toggleSC(i); }); if (today.selfcareCount > 0) done.add('selfcare'); }
  if (today.stressLevel)           { document.getElementById('stressSlider').value = today.stressLevel; onStress(today.stressLevel); if (today.stressSource) document.getElementById('stressSource').value = today.stressSource; if (today.copingMethods) today.copingMethods.forEach(c => { const i = COPING.indexOf(c); if (i>=0) toggleCoping(i); }); if (today.copingNote) document.getElementById('copingNote').value = today.copingNote; if (today.afterCoping) document.getElementById('afterCoping').value = today.afterCoping; done.add('stress'); }
  if (today.keyLesson || today.intention) { if (today.keyLesson) document.getElementById('keyLesson').value = today.keyLesson; if (today.intention) document.getElementById('intention').value = today.intention; if (today.dayWord) document.getElementById('dayWord').value = today.dayWord; done.add('reflection'); }

  setupBreathing();
}

// ── EVENTS ────────────────────────────────────────────────────────────────────

async function loadEvents() {
  const container = document.getElementById('eventsList');
  container.innerHTML = '<div class="loading-msg">⏳ Loading events…</div>';

  // Show active badge
  if (currentUser?.isActive) {
    document.getElementById('activeBadgeWrap').style.display = 'block';
    document.getElementById('myDiscountCode').textContent = currentUser.discountCode;
  }

  const events = await API.get('/events');
  if (events.error || !events.length) {
    container.innerHTML = `<div class="no-hist"><span class="ni">📅</span><p>No upcoming events yet.<br/>Check back soon — sessions are being planned!</p></div>`;
    return;
  }

  const CATEGORY_LABELS = {
    'therapy-session':'🧠 Therapy Session','mental-health-talk':'💬 Mental Health Talk',
    'workshop':'🛠️ Workshop','support-group':'🤝 Support Group',
    'meditation':'🧘 Meditation','webinar':'💻 Webinar'
  };

  container.innerHTML = events.map(ev => {
    const dateStr   = new Date(ev.eventDate).toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });
    const timeStr   = new Date(ev.eventDate).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
    const catLabel  = CATEGORY_LABELS[ev.category] || ev.category;
    const isFull    = ev.spotsLeft <= 0;
    const isPremium = ev.type === 'premium';

    return `
      <div class="event-card ${isPremium ? 'event-premium' : ''}">
        <div class="event-header">
          <span class="event-cat">${catLabel}</span>
          <span class="event-type-badge ${isPremium ? 'premium-badge' : 'free-badge'}">${isPremium ? '💎 Premium' : '🆓 Free'}</span>
        </div>
        <h3 class="event-title">${ev.imageEmoji} ${ev.title}</h3>
        <p class="event-therapist">👤 ${ev.therapistName}</p>
        <p class="event-desc">${ev.description}</p>
        <div class="event-meta">
          <span>📅 ${dateStr}</span>
          <span>🕐 ${timeStr}</span>
          <span>⏱️ ${ev.duration} mins</span>
          <span>📍 ${ev.platform}</span>
        </div>
        <div class="event-footer">
          ${isPremium
            ? ev.myDiscount
              ? `<div class="price-row"><span class="price-orig">$${ev.price}</span><span class="price-disc">$${ev.myDiscount.price} <span class="disc-tag">-${ev.myDiscount.percent}%</span></span></div>`
              : `<span class="price-full">$${ev.price}</span>`
            : `<span class="price-free">Free Event</span>`
          }
          <span class="spots-left ${isFull ? 'spots-full' : ''}">${isFull ? '🚫 Full' : `${ev.spotsLeft} spots left`}</span>
        </div>
        ${ev.isBooked
          ? `<div class="booked-banner">✅ You're booked! <button class="btn-cancel-book" onclick="cancelBooking('${ev._id}')">Cancel</button></div>`
          : isFull
            ? `<button class="btn-book disabled" disabled>Fully Booked</button>`
            : `<button class="btn-book" onclick="bookEvent('${ev._id}', this)">Book My Spot →</button>`
        }
      </div>
    `;
  }).join('');
}

async function bookEvent(eventId, btn) {
  btn.textContent = 'Booking…'; btn.disabled = true;
  const res = await API.post(`/events/${eventId}/book`, {});
  if (res.error) {
    btn.textContent = res.error; btn.disabled = false;
    return;
  }
  // Show success
  btn.closest('.event-card').querySelector('.event-footer').insertAdjacentHTML('afterend',
    `<div class="booked-banner">✅ ${res.message} — Code: <strong>${res.confirmationCode}</strong></div>`
  );
  btn.remove();
  updateNotifBadge();
}

async function cancelBooking(eventId) {
  if (!confirm('Cancel your booking for this event?')) return;
  const res = await API.del(`/events/${eventId}/book`);
  if (!res.error) loadEvents();
}

async function loadMyBookings() {
  const container = document.getElementById('bookingsList');
  container.innerHTML = '<div class="loading-msg">⏳ Loading…</div>';
  const bookings = await API.get('/events/my-bookings');
  if (!bookings.length) {
    container.innerHTML = `<div class="no-hist"><span class="ni">🎟️</span><p>No bookings yet.<br/>Check the Events tab to book a session!</p></div>`;
    return;
  }
  container.innerHTML = bookings.map(b => {
    const ev = b.eventId;
    if (!ev) return '';
    const dateStr = new Date(ev.eventDate).toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });
    return `
      <div class="booking-card">
        <div class="booking-title">${ev.imageEmoji || '📅'} ${ev.title}</div>
        <div class="booking-meta">
          <span>📅 ${dateStr}</span>
          <span>📍 ${ev.platform}</span>
          ${b.appliedDiscount ? `<span class="disc-used">🏷️ Discount applied</span>` : ''}
        </div>
        <div class="booking-code">Confirmation: <strong>${b.confirmationCode}</strong></div>
        ${ev.meetingLink ? `<a class="btn-join" href="${ev.meetingLink}" target="_blank">Join Session →</a>` : ''}
      </div>
    `;
  }).join('');
}

// ── INSIGHTS ──────────────────────────────────────────────────────────────────

async function loadInsights() {
  loadDailyInsight();
  loadWeeklyInsight();
}

async function loadDailyInsight() {
  const el = document.getElementById('dailyInsightContent');
  el.innerHTML = '<div class="loading-msg">⏳ Analysing…</div>';
  const data = await API.get('/analytics/daily');
  el.innerHTML = renderDailyInsightHTML(data);
}

async function loadDailyInsightPopup() {
  const data = await API.get('/analytics/daily');
  if (!data.suggestion) return;
  // Add a notification-style popup on the complete screen
  const el = document.getElementById('completeSummary');
  if (!el) return;
  el.insertAdjacentHTML('afterend', `
    <div class="insight-popup ${data.suggestion.urgent ? 'urgent' : ''}">
      <p>💡 ${data.suggestion.text}</p>
      ${data.suggestion.action === 'view-events' ? `<button class="btn-next" onclick="goTo('events')" style="margin-top:0.5rem;font-size:0.8rem;padding:0.6rem 1rem">View Sessions →</button>` : ''}
    </div>
  `);
}

function renderDailyInsightHTML(data) {
  if (data.type === 'info') return `<div class="insight-info">${data.insights[0]}</div>`;
  const colorMap = { positive:'var(--forest-mid)', concern:'#E65100', warning:'#B71C1C' };
  const color = colorMap[data.type] || colorMap.positive;
  return `
    <div class="insight-card" style="border-left-color:${color}">
      ${data.insights.map(i => `<p class="insight-line">✦ ${i}</p>`).join('')}
      ${data.suggestion ? `
        <div class="insight-suggest ${data.suggestion.urgent ? 'urgent-suggest' : ''}">
          <p>💡 ${data.suggestion.text}</p>
          ${data.suggestion.action === 'view-events' ? `<button class="btn-next" onclick="goTo('events')" style="margin-top:0.5rem;font-size:0.78rem;padding:0.5rem 0.9rem;">View Sessions →</button>` : ''}
        </div>
      ` : ''}
    </div>
  `;
}

async function loadWeeklyInsight() {
  const el = document.getElementById('weeklyInsightContent');
  el.innerHTML = '<div class="loading-msg">⏳ Generating report…</div>';
  const data = await API.get('/analytics/weekly');
  weeklyReportData = data; // cache for PDF

  if (data.type === 'info') { el.innerHTML = `<div class="insight-info">${data.message}</div>`; return; }

  const alertColors = { green:'var(--forest-light)', yellow:'#F59E0B', red:'#EF4444' };
  const moodTrendIcon = { improving:'📈 Improving', stable:'➡️ Stable', declining:'📉 Declining' };

  el.innerHTML = `
    <div class="weekly-stats">
      <div class="w-stat"><span class="w-val">${data.avgMood ?? '—'}</span><span class="w-lbl">Avg Mood</span></div>
      <div class="w-stat"><span class="w-val" style="color:${alertColors[data.alertLevel]}">${data.avgStress ?? '—'}</span><span class="w-lbl">Avg Stress</span></div>
      <div class="w-stat"><span class="w-val">${data.avgSelfcare ?? '—'}</span><span class="w-lbl">Avg Self-Care</span></div>
      <div class="w-stat"><span class="w-val" style="font-size:0.85rem">${moodTrendIcon[data.moodTrend] || '—'}</span><span class="w-lbl">Trend</span></div>
    </div>
    <div class="weekly-mood-label">Most common mood: <strong>${data.dominantMood}</strong> · ${data.totalEntries} entries this week</div>
    ${data.suggestions.map(s => `<div class="weekly-suggest ${s.startsWith('⚠️') || s.startsWith('💙') ? 'suggest-alert' : ''}">${s}</div>`).join('')}
    ${data.recommendTherapist ? `
      <button class="btn-complete" style="margin-top:0.75rem;width:100%;" onclick="goTo('events')">
        Book a Therapy Session →
      </button>` : ''}
  `;

  // Render chart
  renderWeeklyChart(data.chartData);
}

function renderWeeklyChart(chartData) {
  const ctx = document.getElementById('weeklyChart');
  if (!ctx || !chartData?.length) return;
  if (weeklyChartInst) weeklyChartInst.destroy();

  const labels = chartData.map(d => d.date.slice(5)); // MM-DD
  weeklyChartInst = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Mood (1-10)',     data: chartData.map(d => d.moodScore),    borderColor: '#9D4EDD', backgroundColor: 'rgba(157,78,221,0.08)', tension: 0.4, fill: true },
        { label: 'Stress (1-10)',   data: chartData.map(d => d.stressLevel),  borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.06)',   tension: 0.4, fill: false },
        { label: 'Self-Care (/10)', data: chartData.map(d => d.selfcareCount),borderColor: '#52B788', backgroundColor: 'rgba(82,183,136,0.08)',  tension: 0.4, fill: true },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { y: { min: 0, max: 10, grid: { color: 'rgba(0,0,0,0.04)' } }, x: { grid: { display: false } } },
      plugins: { legend: { labels: { font: { family: 'Poppins', size: 11 }, boxWidth: 12 } } }
    }
  });
}

// ── COMPLETE SUMMARY ──────────────────────────────────────────────────────────

function renderSummary() {
  const rows = [];
  if (today.mood)                                  rows.push({ ico: today.mood.emoji, lbl:'Mood',         val: today.mood.label });
  if (today.gratitude?.length)                     rows.push({ ico:'🌿',             lbl:'Gratitude',     val: today.gratitude[0] + (today.gratitude.length > 1 ? ' …' : '') });
  if (today.affirmations?.length)                  rows.push({ ico:'✨',             lbl:'Affirmation',   val: today.affirmations[0] });
  if (today.selfcareCount !== undefined)           rows.push({ ico:'🌟',             lbl:'Self-Care',     val: `${today.selfcareCount} of ${SELFCARE.length} habits` });
  if (today.stressLevel)                           rows.push({ ico:'🌊',             lbl:'Stress Level',  val: `${today.stressLevel}/10 — ${STRESS_MAP[today.stressLevel].desc}` });
  if (today.dayWord)                               rows.push({ ico:'📝',             lbl:'Today was',     val: `"${today.dayWord}"` });
  document.getElementById('completeSummary').innerHTML = rows.map(r => `
    <div class="sum-row"><span class="sum-ico">${r.ico}</span><div class="sum-meta"><span class="sum-lbl">${r.lbl}</span><span class="sum-val">${r.val}</span></div></div>
  `).join('');
}

// ── CONFETTI ──────────────────────────────────────────────────────────────────

function fireConfetti() {
  const stage = document.getElementById('confettiStage'); stage.innerHTML = '';
  const pal   = ['#FFD60A','#9D4EDD','#74C69D','#F4A261','#F9C6D0','#52B788','#C77DFF','#FFB703'];
  for (let i = 0; i < 80; i++) {
    const el = document.createElement('div'); el.className = 'confetti';
    el.style.cssText = `left:${Math.random()*100}%;width:${6+Math.random()*8}px;height:${6+Math.random()*10}px;background:${pal[Math.floor(Math.random()*pal.length)]};border-radius:${Math.random()>.5?'50%':'3px'};animation-duration:${1.4+Math.random()*2}s;animation-delay:${Math.random()*0.6}s;`;
    stage.appendChild(el);
  }
  setTimeout(() => { stage.innerHTML = ''; }, 4000);
}

// ── HISTORY ───────────────────────────────────────────────────────────────────

function renderHistory() {
  const container = document.getElementById('historyList');
  if (!entries.length) {
    container.innerHTML = `<div class="no-hist"><span class="ni">🌱</span><p>Your journey starts today.<br/>Complete your first check-in and it will appear here.</p></div>`;
    return;
  }
  container.innerHTML = entries.map(e => {
    const dateStr = new Date(e.date).toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });
    return `
      <div class="hist-entry">
        <div class="hist-date">${e.mood ? `<span>${e.mood.emoji}</span>` : '<span>📅</span>'} ${dateStr}</div>
        ${e.mood         ? `<div class="hist-row"><span>💭</span><span>Mood: ${e.mood.label}</span></div>` : ''}
        ${e.stressLevel  ? `<div class="hist-row"><span>🌊</span><span>Stress: ${e.stressLevel}/10 — ${STRESS_MAP[e.stressLevel].desc}</span></div>` : ''}
        ${e.selfcareCount !== undefined ? `<div class="hist-row"><span>🌟</span><span>Self-care: ${e.selfcareCount}/${SELFCARE.length}</span></div>` : ''}
        ${e.gratitude?.[0] ? `<div class="hist-row"><span>🌿</span><span>Grateful for: ${e.gratitude[0]}</span></div>` : ''}
        ${e.dayWord        ? `<div class="hist-row"><span>📝</span><span>Today was: "${e.dayWord}"</span></div>` : ''}
        ${e.intention      ? `<div class="hist-row"><span>🎯</span><span>Intention: ${e.intention.slice(0,60)}${e.intention.length>60?'…':''}</span></div>` : ''}
      </div>
    `;
  }).join('');
}

// ══════════════════════════════════════════════════════════
// V2.1 — THERAPIST PROFILE
// ══════════════════════════════════════════════════════════

async function loadTherapistProfile() {
  const el = document.getElementById('therapistProfileContent');
  el.innerHTML = '<div class="loading-msg">Loading…</div>';
  const t = await API.get('/admin/therapist-profile');
  if (!t || t.error) {
    el.innerHTML = `<div class="no-hist"><span class="ni">👩‍⚕️</span><p>Therapist profile coming soon.</p></div>`; return;
  }
  el.innerHTML = `
    <div class="therapist-card">
      <div class="th-photo">
        ${t.profilePhotoUrl
          ? `<img src="${t.profilePhotoUrl}" alt="${t.name}" class="th-img" />`
          : `<div class="th-initials">${t.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}</div>`
        }
      </div>
      <h2 class="th-name">${t.name}</h2>
      <p class="th-title">${t.profileTitle || 'Mental Health Professional'}</p>
      ${t.profileBio ? `<p class="th-bio">${t.profileBio}</p>` : ''}
      <div class="th-tags">
        ${(t.profileSpecializations||[]).map(s => `<span class="th-tag spec-tag">🧠 ${s}</span>`).join('')}
        ${(t.profileLanguages||[]).map(l => `<span class="th-tag lang-tag">🗣️ ${l}</span>`).join('')}
        ${t.profileLocation ? `<span class="th-tag"><span>📍</span>${t.profileLocation}</span>` : ''}
      </div>
      ${t.profilePublicEmail ? `<p class="th-email">✉️ <a href="mailto:${t.profilePublicEmail}">${t.profilePublicEmail}</a></p>` : ''}
      <div class="th-actions">
        <button class="btn-primary" onclick="goTo('chat')">💬 Send a Message</button>
        <button class="btn-outline" onclick="goTo('sessions')">🗓️ Book a Session</button>
      </div>
    </div>
  `;
}

// ══════════════════════════════════════════════════════════
// V2.1 — CHAT
// ══════════════════════════════════════════════════════════

async function openChat() {
  await loadChatMessages();
  // Start active polling every 5s while chat is open
  if (chatPollInterval) clearInterval(chatPollInterval);
  chatPollInterval = setInterval(pollChatMessages, 5000);
}

async function loadChatMessages() {
  const win = document.getElementById('chatWindow');
  win.innerHTML = '<div class="loading-msg">Loading messages…</div>';
  const data = await API.get('/chat');
  if (data.error) { win.innerHTML = `<div class="no-hist"><p>${data.error}</p></div>`; return; }
  renderChatMessages(data.messages);
  // Update badge
  updateChatBadge(0);
}

async function pollChatMessages() {
  // Only poll if chat section is visible
  if (!document.getElementById('sec-chat').classList.contains('active')) return;
  const data = await API.get('/chat');
  if (!data.error) renderChatMessages(data.messages);
}

function renderChatMessages(messages) {
  const win = document.getElementById('chatWindow');
  if (!messages.length) {
    win.innerHTML = `
      <div class="chat-empty">
        <span>💬</span>
        <p>No messages yet. Start the conversation!</p>
        <p class="chat-empty-hint">Your therapist will respond as soon as possible during working hours.</p>
      </div>`;
    return;
  }
  win.innerHTML = messages.map(m => `
    <div class="chat-msg ${m.sender === 'user' ? 'msg-user' : 'msg-admin'}">
      <div class="msg-bubble">${escapeHtml(m.content)}</div>
      <div class="msg-time">${m.sender === 'admin' ? '👩‍⚕️ Therapist · ' : ''}${timeAgo(new Date(m.sentAt))}</div>
    </div>
  `).join('');
  win.scrollTop = win.scrollHeight;
}

async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const content = input.value.trim();
  if (!content) return;
  input.value = ''; input.disabled = true;
  const res = await API.post('/chat', { content });
  input.disabled = false; input.focus();
  if (res.error) { alert(res.error); return; }
  await loadChatMessages();
}

function chatKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}

// ── Chat badge polling (background) ──────────────────────────────────────
async function startChatBadgePolling() {
  if (!authToken) return;
  await updateChatBadgeFromServer();
  setInterval(async () => {
    if (!authToken) return;
    await updateChatBadgeFromServer();
  }, 30000); // every 30s background poll
}

async function updateChatBadgeFromServer() {
  const data = await API.get('/chat/unread');
  if (!data.error) updateChatBadge(data.unread);
}

function updateChatBadge(count) {
  const badges = [
    document.getElementById('navChatBadge'),
    document.getElementById('menuChatBadge'),
  ];
  badges.forEach(b => {
    if (!b) return;
    if (count > 0) { b.textContent = count > 9 ? '9+' : count; b.classList.remove('hidden'); }
    else b.classList.add('hidden');
  });
}

// Stop chat polling when navigating away from chat
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-item, .menu-link').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!btn.getAttribute('onclick')?.includes('chat')) {
        if (chatPollInterval) { clearInterval(chatPollInterval); chatPollInterval = null; }
      }
    });
  });
});

// ══════════════════════════════════════════════════════════
// V2.1 — SESSION BOOKING
// ══════════════════════════════════════════════════════════

function switchSessionTab(tab) {
  document.getElementById('sessionBookPane').classList.toggle('hidden', tab !== 'book');
  document.getElementById('sessionMinePane').classList.toggle('hidden', tab !== 'mine');
  document.getElementById('stabBook').classList.toggle('active', tab === 'book');
  document.getElementById('stabMine').classList.toggle('active', tab === 'mine');
  if (tab === 'mine') loadMySessions();
}

async function loadAvailability() {
  const el = document.getElementById('availabilityList');
  el.innerHTML = '<div class="loading-msg">⏳ Loading available slots…</div>';
  const data = await API.get('/availability');
  if (data.error || !Object.keys(data.grouped || {}).length) {
    el.innerHTML = `<div class="no-hist"><span class="ni">🗓️</span><p>No available sessions right now.<br/>Check back soon or send a message to your therapist.</p></div>`;
    return;
  }
  let html = '';
  for (const [date, slots] of Object.entries(data.grouped)) {
    const dateLabel = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });
    html += `<div class="avail-date-group"><h4 class="avail-date">${dateLabel}</h4>`;
    html += slots.map(s => `
      <div class="avail-slot">
        <div class="slot-time">⏰ ${s.startTime} – ${s.endTime} <span class="slot-dur">(${s.duration} min)</span></div>
        <div class="slot-meta">
          ${s.type === 'both' ? '💻 Online or 🏥 In-person' : s.type === 'online' ? '💻 Online only' : '🏥 In-person only'}
          ${s.location ? ` · 📍 ${s.location}` : ''}
        </div>
        ${s.type !== 'online' ? `
          <div class="slot-type-pick" id="typePick_${s._id}">
            <label><input type="radio" name="type_${s._id}" value="online" ${s.type==='online'?'checked':''} /> 💻 Online</label>
            <label><input type="radio" name="type_${s._id}" value="in-person" ${s.type==='in-person'?'checked':''} /> 🏥 In-person</label>
          </div>` : `<input type="hidden" name="type_${s._id}" value="online" />`}
        <button class="btn-book slot-book-btn" onclick="bookSession('${s._id}', this)">Book This Slot →</button>
      </div>
    `).join('');
    html += `</div>`;
  }
  el.innerHTML = html;
  // Pre-select based on slot type
  for (const [, slots] of Object.entries(data.grouped)) {
    slots.forEach(s => {
      const pick = document.getElementById(`typePick_${s._id}`);
      if (pick) {
        if (s.type === 'in-person') pick.querySelector('input[value="in-person"]').checked = true;
        else if (s.type === 'both') pick.querySelector('input[value="online"]').checked = true;
      }
    });
  }
}

async function bookSession(slotId, btn) {
  const radios = document.querySelectorAll(`input[name="type_${slotId}"]`);
  let type = 'online';
  radios.forEach(r => { if (r.checked) type = r.value; });
  btn.textContent = 'Booking…'; btn.disabled = true;
  const res = await API.post(`/availability/${slotId}/book`, { type });
  if (res.error) {
    btn.textContent = res.error; btn.disabled = false; return;
  }
  const s = res.session;
  btn.closest('.avail-slot').innerHTML = `
    <div class="booked-banner">
      ✅ Session confirmed! Code: <strong>${s.confirmationCode}</strong><br/>
      ${s.date} at ${s.startTime}
      ${s.type === 'online' && s.meetingLink ? `<br/><a href="${s.meetingLink}" target="_blank" class="btn-join">Join Session →</a>` : ''}
    </div>`;
  updateNotifBadge();
}

async function loadMySessions() {
  const el = document.getElementById('mySessionsList');
  el.innerHTML = '<div class="loading-msg">Loading…</div>';
  const data = await API.get('/availability/my-sessions');
  if (!data.sessions?.length) {
    el.innerHTML = `<div class="no-hist"><span class="ni">🩺</span><p>No sessions booked yet.</p></div>`; return;
  }
  el.innerHTML = data.sessions.map(s => {
    const av = s.availabilityId;
    const isUpcoming = av && new Date(`${av.date}T${av.startTime}`) > new Date();
    return `
      <div class="session-card ${s.status}">
        <div class="sess-status ${s.status}">${s.status === 'confirmed' ? '✅ Confirmed' : s.status === 'cancelled' ? '❌ Cancelled' : '🏁 Completed'}</div>
        ${av ? `<div class="sess-date">📅 ${av.date} at ${av.startTime} – ${av.endTime}</div>` : ''}
        <div class="sess-type">${s.type === 'online' ? '💻 Online' : '🏥 In-person'}</div>
        <div class="sess-code">Code: <strong>${s.confirmationCode}</strong></div>
        ${s.type === 'online' && s.meetingLink ? `<a class="btn-join" href="${s.meetingLink}" target="_blank">Join Session →</a>` : ''}
        ${s.status === 'confirmed' && isUpcoming
          ? `<button class="btn-cancel-book" onclick="cancelSession('${s._id}', this)">Cancel Session</button>` : ''}
      </div>`;
  }).join('');
}

async function cancelSession(sessionId, btn) {
  if (!confirm('Cancel this session?')) return;
  btn.disabled = true; btn.textContent = 'Cancelling…';
  const res = await API.del(`/availability/${sessionId}/cancel`);
  if (res.error) { btn.textContent = res.error; btn.disabled = false; return; }
  loadMySessions();
}

// ══════════════════════════════════════════════════════════
// V2.1 — PDF WEEKLY REPORT
// ══════════════════════════════════════════════════════════

async function downloadWeeklyPDF() {
  const btn = document.getElementById('btnDownloadPdf');
  if (!weeklyReportData || weeklyReportData.type === 'info') {
    alert('Complete at least 2 days of check-ins to generate a weekly report.'); return;
  }

  btn.textContent = '⏳ Generating…'; btn.disabled = true;

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const GREEN  = [27, 67, 50];
    const PURPLE = [157, 78, 221];
    const GOLD   = [255, 214, 10];
    const WHITE  = [255, 255, 255];
    const GREY   = [113, 128, 150];

    const W = 210, margin = 18;
    const now = new Date();
    const dateLabel = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const userName  = currentUser?.name || 'Member';
    const d = weeklyReportData;

    // Header bar
    doc.setFillColor(...GREEN);
    doc.rect(0, 0, W, 38, 'F');
    doc.setTextColor(...GOLD);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Embracing The Journey Within', margin, 16);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...WHITE);
    doc.text('Weekly Wellness Report', margin, 24);
    doc.text(`${userName}  ·  ${dateLabel}`, margin, 31);

    // Confidentiality banner
    doc.setFillColor(240, 240, 245);
    doc.roundedRect(margin, 42, W - margin * 2, 10, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setTextColor(...GREY);
    doc.setFont('helvetica', 'italic');
    doc.text('🔒  This report is private and confidential. For your eyes only.', margin + 4, 48.5);

    // Stats boxes
    const alertColors = { green: [27, 67, 50], yellow: [245, 158, 11], red: [239, 68, 68] };
    const ac = alertColors[d.alertLevel] || alertColors.green;
    const stats = [
      { label: 'Avg Mood',      val: d.avgMood    ?? '—', color: GREEN  },
      { label: 'Avg Stress',    val: d.avgStress  ?? '—', color: ac     },
      { label: 'Avg Self-Care', val: d.avgSelfcare?? '—', color: GREEN  },
      { label: 'Entries',       val: d.totalEntries,       color: PURPLE },
    ];
    const bw = (W - margin * 2 - 9) / 4;
    stats.forEach((s, i) => {
      const x = margin + i * (bw + 3), y = 56;
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, y, bw, 22, 3, 3, 'F');
      doc.setTextColor(...s.color);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(String(s.val), x + bw / 2, y + 12, { align: 'center' });
      doc.setFontSize(7);
      doc.setTextColor(...GREY);
      doc.setFont('helvetica', 'normal');
      doc.text(s.label, x + bw / 2, y + 18, { align: 'center' });
    });

    // Mood trend
    const trendMap = { improving: '📈 Improving', stable: '➡️ Stable', declining: '📉 Declining' };
    doc.setFontSize(10); doc.setTextColor(50, 50, 50); doc.setFont('helvetica', 'bold');
    doc.text('Mood Trend: ', margin, 90);
    doc.setFont('helvetica', 'normal');
    doc.text(trendMap[d.moodTrend] || d.moodTrend, margin + 28, 90);

    doc.text(`Most Common Mood: ${d.dominantMood}`, W / 2, 90, { align: 'center' });

    // Divider
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.3);
    doc.line(margin, 95, W - margin, 95);

    // Weekly chart as image (capture canvas)
    const canvas = document.getElementById('weeklyChart');
    if (canvas) {
      const imgData = canvas.toDataURL('image/png');
      const chartH  = 55;
      doc.addImage(imgData, 'PNG', margin, 98, W - margin * 2, chartH);
    }

    // Suggestions section
    let sy = 160;
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...GREEN);
    doc.text('Personalised Suggestions', margin, sy); sy += 7;
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 50, 50);
    (d.suggestions || []).forEach(sug => {
      const lines = doc.splitTextToSize(sug, W - margin * 2 - 4);
      lines.forEach(line => { doc.text(line, margin + 2, sy); sy += 5.5; });
      sy += 1;
    });

    // Footer
    const footerY = 285;
    doc.setFillColor(...GREEN);
    doc.rect(0, footerY, W, 12, 'F');
    doc.setFontSize(8); doc.setTextColor(...WHITE); doc.setFont('helvetica', 'normal');
    doc.text('Embracing The Journey Within — Confidential & Private', W / 2, footerY + 7, { align: 'center' });

    doc.save(`Wellness_Report_${now.toISOString().slice(0,10)}.pdf`);
  } catch (err) {
    console.error('PDF error:', err);
    alert('Could not generate PDF. Please try again.');
  }

  btn.textContent = '📄 Download Report'; btn.disabled = false;
}
