/* ══════════════════════════════════════════════
   EMBRACING THE JOURNEY WITHIN — APP.JS
   ══════════════════════════════════════════════ */

'use strict';

// ── DATA CONSTANTS ──────────────────────────────

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
  'I am enough',
  'I am strong',
  'I am worthy of love',
  'I am capable',
  'I am growing',
  'I am at peace',
  'I am grateful',
  'I am resilient',
  'I am healing',
  'I am brave',
  'I am choosing joy',
  'I am protected',
];

const SELFCARE = [
  { emoji:'💧', label:'Drank enough water'          },
  { emoji:'😴', label:'Got enough sleep'             },
  { emoji:'🚶', label:'Moved my body'                },
  { emoji:'🙏', label:'Prayer / Meditation'          },
  { emoji:'🍎', label:'Ate nourishing food'          },
  { emoji:'💊', label:'Took my medication'           },
  { emoji:'📵', label:'Limited screen time'          },
  { emoji:'🤝', label:'Connected with someone'       },
  { emoji:'🎉', label:'Did something I enjoy'        },
  { emoji:'✏️',  label:'Others', custom: true        },
];

const COPING = [
  'Deep breathing','Exercise','Journaling','Talking to someone',
  'Prayer / Faith','Music','Walk in nature','Rest / Sleep',
  'Creative activity','Mindfulness','Cold water','Gratitude list',
];

const STRESS_MAP = {
  1:  { desc:'Barely There',    color:'#1B9E5B' },
  2:  { desc:'Very Low',        color:'#27AE60' },
  3:  { desc:'Mild',            color:'#78C53C' },
  4:  { desc:'Manageable',      color:'#B5D334' },
  5:  { desc:'Moderate',        color:'#F0C100' },
  6:  { desc:'Noticeable',      color:'#F59E0B' },
  7:  { desc:'High',            color:'#F97316' },
  8:  { desc:'Very High',       color:'#EF4444' },
  9:  { desc:'Intense',         color:'#DC2626' },
  10: { desc:'Overwhelming',    color:'#991B1B' },
};

const QUOTES = [
  // — Hope in the dark —
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

  // — Healing & self-worth —
  'You don\'t have to have it all figured out to move forward.',
  'Your feelings are valid. Your healing is possible.',
  'Progress is progress, no matter how small it seems.',
  'Be gentle with yourself — you are still becoming.',
  'Healing is not linear. Every step — even backward — is part of the journey.',
  'You are braver than you believe and stronger than you know.',
  'Taking care of yourself is one of the greatest acts of love.',
  'Your mental health matters just as much as your physical health.',
  'Breathe. You have survived every hard day so far — that is 100%.',
  'Small steps every day lead to extraordinary change.',
  'It\'s okay to not be okay. What matters is you don\'t stay there alone.',
  'Rest is productive. Healing is progress.',
  'You are not your thoughts — you are the one who notices them.',
  'Your worth is not measured by your productivity.',
  'Every new day is a new beginning. Start again, gently.',
  'The fact that you\'re still trying is already something beautiful.',
  'You deserve the same compassion you so freely give to others.',
  'Showing up for yourself today is an act of courage.',

  // — Growth & becoming —
  'You are not the same person you were a year ago. That is growth.',
  'Some of the most beautiful people in the world were built through struggle.',
  'Your story is not over. Turn the page.',
  'Everything you are going through is preparing you for everything you asked for.',
  'The person you are becoming is worth every hard moment.',
  'Pain is not permanent. But the strength you gain from it is.',
  'You were not made to just survive — you were made to flourish.',
  'Every storm you survive makes the next rainbow more beautiful.',
  'Don\'t rush your healing. Great things take time.',
  'You are enough. You have always been enough.',
];

const STEPS = [
  { id:'mood',         emoji:'💭', label:'Mood'       },
  { id:'gratitude',    emoji:'🌿', label:'Gratitude'  },
  { id:'affirmations', emoji:'✨', label:'Affirm'     },
  { id:'selfcare',     emoji:'🌟', label:'Self-Care'  },
  { id:'stress',       emoji:'🌊', label:'Stress'     },
  { id:'reflection',   emoji:'📝', label:'Reflect'    },
];

// ── STATE ─────────────────────────────────────────

let today          = {};
let entries        = [];
let selectedMood   = null;
let selAffirms     = new Set();
let checkedSC      = new Set();
let selCoping      = new Set();
let done           = new Set();     // completed section IDs
let breathPhase    = null;
let breathTimer    = null;

// ── BOOT ─────────────────────────────────────────

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

function init() {
  loadEntries();
  buildMoodGrid();
  buildAffirmGrid();
  buildSCList();
  buildCopingTags();
  restoreToday();
  updateDashboard();
  updateProgress();
}

// ── NAVIGATION ────────────────────────────────────

function goTo(id) {
  document.querySelectorAll('.sec').forEach(s => s.classList.remove('active'));
  document.getElementById('sec-' + id).classList.add('active');

  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  const nb = document.querySelector(`.nav-item[data-s="${id}"]`);
  if (nb) nb.classList.add('active');

  closeMenu();

  if (id === 'history')   renderHistory();
  if (id === 'dashboard') updateDashboard();
}

function advance(sectionId) {
  saveSection(sectionId);
  done.add(sectionId);
  updateProgress();

  const idx = STEPS.findIndex(s => s.id === sectionId);
  if (idx < STEPS.length - 1) {
    goTo(STEPS[idx + 1].id);
  }
}

function finish() {
  saveSection('reflection');
  done.add('reflection');
  updateProgress();
  persistEntry();
  goTo('complete');
  renderSummary();
  fireConfetti();
}

// ── MENU ─────────────────────────────────────────

function toggleMenu() {
  const menu    = document.getElementById('sideMenu');
  const overlay = document.getElementById('menuOverlay');
  const open    = menu.classList.contains('open');
  if (open) closeMenu();
  else {
    menu.classList.add('open');
    overlay.classList.add('open');
  }
}

function closeMenu() {
  document.getElementById('sideMenu').classList.remove('open');
  document.getElementById('menuOverlay').classList.remove('open');
}

// ── PROGRESS RING ─────────────────────────────────

function updateProgress() {
  const pct  = Math.round((done.size / STEPS.length) * 100);
  const circ = 2 * Math.PI * 16;          // r = 16
  const fill = (pct / 100) * circ;

  document.getElementById('ringFill').style.strokeDasharray = `${fill} ${circ}`;
  document.getElementById('progPct').textContent = `${pct}%`;

  renderStepsGrid();
}

// ── DASHBOARD ─────────────────────────────────────

function updateDashboard() {
  const now  = new Date();
  const hr   = now.getHours();
  const greet = hr < 12 ? 'Good Morning ☀️' : hr < 17 ? 'Good Afternoon 🌤️' : 'Good Evening 🌙';
  document.getElementById('greeting').textContent = greet;

  document.getElementById('heroDate').textContent = now.toLocaleDateString('en-US', {
    weekday:'long', year:'numeric', month:'long', day:'numeric',
  });

  document.getElementById('quoteText').textContent =
    QUOTES[Math.floor(Math.random() * QUOTES.length)];

  renderStats();
  renderStepsGrid();
}

function renderStats() {
  const streak = calcStreak();
  document.getElementById('statsRow').innerHTML = `
    <div class="stat-card">
      <span class="stat-val">🔥 ${streak}</span>
      <span class="stat-lbl">Day Streak</span>
    </div>
    <div class="stat-card">
      <span class="stat-val">📖 ${entries.length}</span>
      <span class="stat-lbl">Total Entries</span>
    </div>
  `;
}

function calcStreak() {
  if (!entries.length) return 0;
  let streak = 0;
  const sorted = [...entries].sort((a,b) => new Date(b.date) - new Date(a.date));
  let check = new Date(); check.setHours(0,0,0,0);
  for (const e of sorted) {
    const d = new Date(e.date); d.setHours(0,0,0,0);
    if (d.getTime() === check.getTime()) {
      streak++;
      check.setDate(check.getDate() - 1);
    } else break;
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

// ── MOOD ─────────────────────────────────────────

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
  document.querySelectorAll('.mood-btn').forEach((b, j) =>
    b.classList.toggle('sel', j === i)
  );
  document.getElementById('moodNoteCard').style.display = 'block';
}

// ── AFFIRMATIONS ──────────────────────────────────

function buildAffirmGrid() {
  document.getElementById('affirmGrid').innerHTML = AFFIRMATIONS.map((a, i) => `
    <button class="affirm-btn" data-i="${i}" onclick="toggleAffirm(${i})">${a}</button>
  `).join('');
}

function toggleAffirm(i) {
  const btn = document.querySelector(`.affirm-btn[data-i="${i}"]`);
  if (selAffirms.has(i)) { selAffirms.delete(i); btn.classList.remove('sel'); }
  else                   { selAffirms.add(i);    btn.classList.add('sel');    }
}

// ── SELF-CARE ─────────────────────────────────────

function buildSCList() {
  document.getElementById('scList').innerHTML = SELFCARE.map((item, i) => `
    <div class="sc-item" data-i="${i}" onclick="toggleSC(${i})">
      <div class="sc-box">✓</div>
      <span class="sc-ico">${item.emoji}</span>
      <span class="sc-txt">${item.label}</span>
    </div>
    ${item.custom ? `
    <div class="sc-other-wrap" id="scOtherWrap" style="display:none">
      <input class="input-line sc-other-input" id="scOtherInput" type="text"
        placeholder="What else did you do for yourself today?" onclick="event.stopPropagation()"/>
    </div>` : ''}
  `).join('');
}

function toggleSC(i) {
  const el = document.querySelector(`.sc-item[data-i="${i}"]`);
  if (checkedSC.has(i)) {
    checkedSC.delete(i);
    el.classList.remove('checked');
  } else {
    checkedSC.add(i);
    el.classList.add('checked');
  }
  // Show/hide the "Others" free-text field
  if (SELFCARE[i].custom) {
    const wrap = document.getElementById('scOtherWrap');
    if (wrap) wrap.style.display = checkedSC.has(i) ? 'block' : 'none';
  }
  refreshSCScore();
}

function refreshSCScore() {
  const n = checkedSC.size, t = SELFCARE.length;
  document.getElementById('scScore').textContent = `${n} / ${t}`;
  document.getElementById('scBar').style.width   = `${(n / t) * 100}%`;
  const msgs = ['Every step counts 💚','You\'re caring for yourself 🌱','Keep going — you\'re doing great 🌟','Amazing self-care today! 🏆'];
  document.getElementById('scMsg').textContent = msgs[Math.min(Math.floor((n/t)*msgs.length), msgs.length-1)];
}

// ── STRESS ────────────────────────────────────────

function buildCopingTags() {
  document.getElementById('copingTags').innerHTML = COPING.map((c, i) => `
    <button class="coping-tag" data-i="${i}" onclick="toggleCoping(${i})">${c}</button>
  `).join('');
}

function toggleCoping(i) {
  const el = document.querySelector(`.coping-tag[data-i="${i}"]`);
  if (selCoping.has(i)) { selCoping.delete(i); el.classList.remove('sel'); }
  else                  { selCoping.add(i);    el.classList.add('sel');    }
}

function onStress(val) {
  const v   = parseInt(val);
  const lvl = STRESS_MAP[v];
  document.getElementById('stressNum').textContent  = v;
  document.getElementById('stressNum').style.color  = lvl.color;
  document.getElementById('stressLbl').textContent  = lvl.desc;

  // Show breathing exercise if stress is high
  document.getElementById('breathBox').style.display = v >= 7 ? 'block' : 'none';
}

// ── 4-7-8 Breathing ──────────────────────────────

function setupBreathing() {
  document.getElementById('breathCircle').addEventListener('click', runBreath);
}

function runBreath() {
  if (breathTimer) return;       // already running
  const circle = document.getElementById('breathCircle');
  const text   = document.getElementById('breathText');
  const hint   = document.getElementById('breathHint');
  hint.textContent = 'Follow the circle...';

  const phases = [
    { cls:'inhale', label:'Inhale…',     dur:4000  },
    { cls:'hold',   label:'Hold…',       dur:7000  },
    { cls:'exhale', label:'Exhale…',     dur:8000  },
  ];

  let p = 0;
  function next() {
    circle.className = 'breath-circle';
    void circle.offsetWidth;              // reflow to restart animation
    const ph = phases[p % phases.length];
    circle.classList.add(ph.cls);
    text.textContent = ph.label;
    p++;
    if (p < phases.length * 3) {         // 3 full cycles
      breathTimer = setTimeout(next, ph.dur);
    } else {
      breathTimer = null;
      circle.className = 'breath-circle';
      text.textContent  = 'Well done ✨';
      hint.textContent  = '4-7-8 breathing reduces anxiety in minutes';
    }
  }
  next();
}

// ── WORD COUNT ────────────────────────────────────

function wordCount(ta, id) {
  const w = ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0;
  document.getElementById(id).textContent = `${w} word${w !== 1 ? 's' : ''}`;
}

// ── SAVE SECTION DATA ─────────────────────────────

function saveSection(id) {
  switch (id) {
    case 'mood':
      if (selectedMood !== null) {
        today.mood     = { idx: selectedMood, ...MOODS[selectedMood] };
        today.moodNote = document.getElementById('moodNote').value.trim();
      }
      break;

    case 'gratitude':
      today.gratitude = [
        document.getElementById('grat1').value.trim(),
        document.getElementById('grat2').value.trim(),
        document.getElementById('grat3').value.trim(),
      ].filter(Boolean);
      break;

    case 'affirmations':
      today.affirmations  = [...selAffirms].map(i => AFFIRMATIONS[i]);
      today.customAffirm  = document.getElementById('customAffirm').value.trim();
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
      today.keyLesson  = document.getElementById('keyLesson').value.trim();
      today.intention  = document.getElementById('intention').value.trim();
      today.dayWord    = document.getElementById('dayWord').value.trim();
      break;
  }
}

// ── PERSIST / LOAD ────────────────────────────────

function persistEntry() {
  today.date      = new Date().toISOString();
  today.completed = true;

  const todayStr = new Date().toDateString();
  entries = entries.filter(e => new Date(e.date).toDateString() !== todayStr);
  entries.unshift(today);

  try { localStorage.setItem('jtw_entries', JSON.stringify(entries)); } catch(_) {}
}

function loadEntries() {
  try {
    const raw = localStorage.getItem('jtw_entries');
    entries = raw ? JSON.parse(raw) : [];
  } catch(_) { entries = []; }
}

function restoreToday() {
  const todayStr = new Date().toDateString();
  const existing = entries.find(e => new Date(e.date).toDateString() === todayStr);
  if (!existing) { setupBreathing(); return; }

  today = existing;

  // Mood
  if (today.mood !== undefined) {
    pickMood(today.mood.idx);
    if (today.moodNote) document.getElementById('moodNote').value = today.moodNote;
    done.add('mood');
  }

  // Gratitude
  if (today.gratitude && today.gratitude.length) {
    ['grat1','grat2','grat3'].forEach((id, i) => {
      if (today.gratitude[i]) document.getElementById(id).value = today.gratitude[i];
    });
    done.add('gratitude');
  }

  // Affirmations
  if (today.affirmations) {
    today.affirmations.forEach(a => {
      const i = AFFIRMATIONS.indexOf(a);
      if (i >= 0) toggleAffirm(i);
    });
    if (today.customAffirm) document.getElementById('customAffirm').value = today.customAffirm;
    if (today.affirmations.length || today.customAffirm) done.add('affirmations');
  }

  // Self-care
  if (today.selfcare) {
    today.selfcare.forEach(item => {
      const i = SELFCARE.findIndex(s => s.label === item.label);
      if (i >= 0) toggleSC(i);
    });
    if (today.selfcareCount > 0) done.add('selfcare');
  }

  // Stress
  if (today.stressLevel) {
    document.getElementById('stressSlider').value = today.stressLevel;
    onStress(today.stressLevel);
    if (today.stressSource) document.getElementById('stressSource').value = today.stressSource;
    if (today.copingMethods) {
      today.copingMethods.forEach(c => {
        const i = COPING.indexOf(c);
        if (i >= 0) toggleCoping(i);
      });
    }
    if (today.copingNote)   document.getElementById('copingNote').value   = today.copingNote;
    if (today.afterCoping)  document.getElementById('afterCoping').value  = today.afterCoping;
    done.add('stress');
  }

  // Reflection
  if (today.keyLesson || today.intention) {
    if (today.keyLesson) document.getElementById('keyLesson').value = today.keyLesson;
    if (today.intention) document.getElementById('intention').value = today.intention;
    if (today.dayWord)   document.getElementById('dayWord').value   = today.dayWord;
    done.add('reflection');
  }

  setupBreathing();
}

// ── COMPLETE SUMMARY ──────────────────────────────

function renderSummary() {
  const rows = [];

  if (today.mood)
    rows.push({ ico: today.mood.emoji,  lbl:'Mood',        val: today.mood.label });
  if (today.gratitude && today.gratitude.length)
    rows.push({ ico:'🌿', lbl:'Gratitude',   val: today.gratitude[0] + (today.gratitude.length > 1 ? ' …' : '') });
  if (today.affirmations && today.affirmations.length)
    rows.push({ ico:'✨', lbl:'Affirmation', val: today.affirmations[0] });
  if (today.selfcareCount !== undefined)
    rows.push({ ico:'🌟', lbl:'Self-Care',   val: `${today.selfcareCount} of ${SELFCARE.length} habits` });
  if (today.stressLevel)
    rows.push({ ico:'🌊', lbl:'Stress Level',val: `${today.stressLevel}/10 — ${STRESS_MAP[today.stressLevel].desc}` });
  if (today.dayWord)
    rows.push({ ico:'📝', lbl:'Today was',   val: `"${today.dayWord}"` });

  document.getElementById('completeSummary').innerHTML = rows.map(r => `
    <div class="sum-row">
      <span class="sum-ico">${r.ico}</span>
      <div class="sum-meta">
        <span class="sum-lbl">${r.lbl}</span>
        <span class="sum-val">${r.val}</span>
      </div>
    </div>
  `).join('');
}

// ── CONFETTI ──────────────────────────────────────

function fireConfetti() {
  const stage  = document.getElementById('confettiStage');
  stage.innerHTML = '';
  const palette = ['#FFD60A','#9D4EDD','#74C69D','#F4A261','#F9C6D0','#52B788','#C77DFF','#FFB703'];

  for (let i = 0; i < 80; i++) {
    const el = document.createElement('div');
    el.className = 'confetti';
    el.style.cssText = `
      left:${Math.random()*100}%;
      width:${6 + Math.random()*8}px;
      height:${6 + Math.random()*10}px;
      background:${palette[Math.floor(Math.random()*palette.length)]};
      border-radius:${Math.random()>.5?'50%':'3px'};
      animation-duration:${1.4+Math.random()*2}s;
      animation-delay:${Math.random()*0.6}s;
    `;
    stage.appendChild(el);
  }
  setTimeout(() => { stage.innerHTML = ''; }, 4000);
}

// ── HISTORY ───────────────────────────────────────

function renderHistory() {
  const container = document.getElementById('historyList');

  if (!entries.length) {
    container.innerHTML = `
      <div class="no-hist">
        <span class="ni">🌱</span>
        <p>Your journey starts today.<br/>
           Complete your first check-in and<br/>
           it will appear here.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = entries.map(e => {
    const d = new Date(e.date);
    const dateStr = d.toLocaleDateString('en-US', {
      weekday:'long', month:'long', day:'numeric', year:'numeric',
    });
    return `
      <div class="hist-entry">
        <div class="hist-date">
          ${e.mood ? `<span>${e.mood.emoji}</span>` : '<span>📅</span>'}
          ${dateStr}
        </div>
        ${e.mood        ? `<div class="hist-row"><span>💭</span><span>Mood: ${e.mood.label}</span></div>` : ''}
        ${e.stressLevel ? `<div class="hist-row"><span>🌊</span><span>Stress: ${e.stressLevel}/10 — ${STRESS_MAP[e.stressLevel].desc}</span></div>` : ''}
        ${e.selfcareCount !== undefined ? `<div class="hist-row"><span>🌟</span><span>Self-care: ${e.selfcareCount}/${SELFCARE.length} habits</span></div>` : ''}
        ${e.gratitude && e.gratitude[0] ? `<div class="hist-row"><span>🌿</span><span>Grateful for: ${e.gratitude[0]}</span></div>` : ''}
        ${e.dayWord     ? `<div class="hist-row"><span>📝</span><span>Today was: "${e.dayWord}"</span></div>` : ''}
        ${e.intention   ? `<div class="hist-row"><span>🎯</span><span>Intention: ${e.intention.slice(0,60)}${e.intention.length>60?'…':''}</span></div>` : ''}
      </div>
    `;
  }).join('');
}
