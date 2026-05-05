'use strict';

let adminToken    = null;
let activityChart = null;
let dauChart      = null;
let activeConvoId = null;
let chatPollInt   = null;

/* ── AUTH ── */
async function adminLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('alBtn');
  const err = document.getElementById('alError');
  btn.textContent = 'Signing in…'; btn.disabled = true; err.classList.add('hidden');

  const res = await apiFetch('POST', '/auth/login', {
    email:    document.getElementById('alEmail').value.trim(),
    password: document.getElementById('alPass').value,
  });

  if (res.error || res.user?.role !== 'admin') {
    err.textContent = res.error || 'Access denied — admin only.';
    err.classList.remove('hidden');
    btn.textContent = 'Sign In →'; btn.disabled = false;
    return;
  }

  adminToken = res.token;
  document.getElementById('adminLogin').classList.add('hidden');
  document.getElementById('adminDash').classList.remove('hidden');
  loadOverview();
  startAdminChatBadgePoll();
}

function adminLogout() {
  adminToken = null;
  document.getElementById('adminLogin').classList.remove('hidden');
  document.getElementById('adminDash').classList.add('hidden');
}

/* ── PANELS ── */
function showPanel(id) {
  document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.sb-link').forEach(l => l.classList.remove('active'));
  document.getElementById('panel-' + id).classList.remove('hidden');
  document.querySelector(`.sb-link[data-p="${id}"]`).classList.add('active');

  if (id === 'overview')     loadOverview();
  if (id === 'events')       loadAdminEvents();
  if (id === 'availability') loadAdminAvailability();
  if (id === 'chat')         loadAdminConversations();
  if (id === 'profile')      loadAdminProfile();
}

/* ── OVERVIEW ── */
async function loadOverview() {
  const grid = document.getElementById('statsGrid');
  grid.innerHTML = '<div class="stat-card loading">Loading…</div>';

  const data = await apiFetch('GET', '/admin/stats');
  if (data.error) { grid.innerHTML = `<div class="stat-card">${data.error}</div>`; return; }

  const { totalUsers, activeUsers, totalEntries, upcomingEvents, totalBookings,
          unreadChats, upcomingSessions, weeklyActivity, dailyActiveUsers, aggregates } = data;

  grid.innerHTML = [
    { icon:'👥', val: totalUsers,        lbl:'Registered Users'   },
    { icon:'⭐', val: activeUsers,       lbl:'Active Members'      },
    { icon:'📖', val: totalEntries,      lbl:'Total Check-ins'     },
    { icon:'📅', val: upcomingEvents,    lbl:'Upcoming Events'     },
    { icon:'🎟️', val: totalBookings,     lbl:'Event Bookings'      },
    { icon:'🩺', val: upcomingSessions,  lbl:'Upcoming Sessions'   },
    { icon:'💬', val: unreadChats,       lbl:'Unread Messages'     },
  ].map(s => `
    <div class="stat-card">
      <div class="sc-icon">${s.icon}</div>
      <div class="sc-val">${s.val}</div>
      <div class="sc-lbl">${s.lbl}</div>
    </div>
  `).join('');

  /* Activity chart */
  const labels = (weeklyActivity || []).map(d => d._id.slice(5));
  const counts = (weeklyActivity || []).map(d => d.count);
  const ctx    = document.getElementById('activityChart');
  if (activityChart) activityChart.destroy();
  activityChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'Check-ins', data: counts, backgroundColor: 'rgba(45,106,79,0.75)', borderRadius: 6 }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } },
      plugins: { legend: { display: false } }
    }
  });

  /* Daily Active Users chart */
  const dauLabels = (dailyActiveUsers || []).map(d => d.date.slice(5));
  const dauCounts = (dailyActiveUsers || []).map(d => d.count);
  const dauCtx    = document.getElementById('dauChart');
  if (dauChart) dauChart.destroy();
  dauChart = new Chart(dauCtx, {
    type: 'bar',
    data: {
      labels: dauLabels,
      datasets: [{ label: 'Active Users', data: dauCounts, backgroundColor: 'rgba(157,78,221,0.65)', borderRadius: 6 }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } },
      plugins: { legend: { display: false } }
    }
  });

  /* Aggregates */
  const agg = aggregates || {};
  document.getElementById('aggCard').innerHTML = `
    <h3>Anonymous Wellness Aggregates (all users)</h3>
    <div class="agg-row">
      <div class="agg-item"><span class="agg-val">${agg.avgMood?.toFixed(1) ?? '—'}</span><span class="agg-lbl">Avg Mood Score (1-10)</span></div>
      <div class="agg-item"><span class="agg-val">${agg.avgStress?.toFixed(1) ?? '—'}</span><span class="agg-lbl">Avg Stress Level (1-10)</span></div>
      <div class="agg-item"><span class="agg-val">${agg.avgOverall?.toFixed(1) ?? '—'}</span><span class="agg-lbl">Avg Overall Score</span></div>
    </div>
    <p class="agg-note">⚠️ Individual user journal entries are never accessible from this dashboard — by design.</p>
  `;
}

/* ── EVENTS ── */
async function loadAdminEvents() {
  const container = document.getElementById('adminEventsList');
  container.innerHTML = '<div class="adm-loading">Loading…</div>';
  const events = await apiFetch('GET', '/admin/events');
  if (!events.length) { container.innerHTML = '<p>No events yet. Create one!</p>'; return; }

  const STATUS_COLORS = { upcoming:'#27AE60', live:'#F59E0B', completed:'#9E9E9E', cancelled:'#EF4444' };

  container.innerHTML = `
    <table class="ev-table">
      <thead>
        <tr><th>Event</th><th>Date</th><th>Type</th><th>Bookings</th><th>Status</th><th>Actions</th></tr>
      </thead>
      <tbody>
        ${events.map(ev => `
          <tr>
            <td><strong>${ev.imageEmoji} ${ev.title}</strong><br/><small>${ev.therapistName}</small></td>
            <td>${new Date(ev.eventDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</td>
            <td>${ev.type === 'premium' ? '💎 Premium' : '🆓 Free'}</td>
            <td>${ev.bookingCount || 0} / ${ev.capacity}</td>
            <td><span class="status-pill" style="background:${STATUS_COLORS[ev.status]}20;color:${STATUS_COLORS[ev.status]}">${ev.status}</span></td>
            <td class="ev-actions">
              <select onchange="updateEventStatus('${ev._id}', this.value)" class="status-sel">
                <option value="">Update status</option>
                <option value="upcoming">upcoming</option>
                <option value="live">live</option>
                <option value="completed">completed</option>
                <option value="cancelled">cancelled</option>
              </select>
              <button class="adm-btn-sm" onclick="viewBookings('${ev._id}', '${ev.title}')">👥 Attendees</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function updateEventStatus(id, status) {
  if (!status) return;
  const res = await apiFetch('PATCH', `/admin/events/${id}`, { status });
  if (!res.error) loadAdminEvents();
}

async function viewBookings(eventId, eventTitle) {
  const bookings = await apiFetch('GET', `/admin/events/${eventId}/bookings`);
  const info = bookings.length
    ? bookings.map(b => `• ${b.userId?.name || 'Unknown'} — ${b.userId?.email || ''} (${b.confirmationCode})`).join('\n')
    : 'No bookings yet.';
  alert(`Attendees for "${eventTitle}":\n\n${info}`);
}

/* ── CREATE EVENT ── */
function togglePricing(type) {
  document.getElementById('pricingRow').style.display = type === 'premium' ? 'flex' : 'none';
}

async function createEvent(e) {
  e.preventDefault();
  const btn = document.getElementById('createBtn');
  const err = document.getElementById('createError');
  btn.textContent = 'Creating…'; btn.disabled = true; err.classList.add('hidden');

  const payload = {
    title:          document.getElementById('evTitle').value.trim(),
    therapistName:  document.getElementById('evTherapist').value.trim(),
    description:    document.getElementById('evDesc').value.trim(),
    eventDate:      document.getElementById('evDate').value,
    duration:       parseInt(document.getElementById('evDuration').value),
    category:       document.getElementById('evCategory').value,
    type:           document.getElementById('evType').value,
    price:          parseFloat(document.getElementById('evPrice').value) || 0,
    discountPercent:parseInt(document.getElementById('evDiscount').value) || 20,
    platform:       document.getElementById('evPlatform').value.trim() || 'Zoom',
    capacity:       parseInt(document.getElementById('evCapacity').value),
    meetingLink:    document.getElementById('evLink').value.trim(),
    imageEmoji:     document.getElementById('evEmoji').value.trim() || '🧠',
  };

  const res = await apiFetch('POST', '/admin/events', payload);
  if (res.error) {
    err.textContent = res.error; err.classList.remove('hidden');
    btn.textContent = '📅 Create Event & Notify All Users'; btn.disabled = false;
  } else {
    btn.textContent = '✅ Event Created! All users notified.';
    setTimeout(() => { btn.textContent = '📅 Create Event & Notify All Users'; btn.disabled = false; showPanel('events'); }, 2000);
    e.target.reset();
    document.getElementById('pricingRow').style.display = 'none';
  }
}

/* ── NOTIFY ── */
document.addEventListener('DOMContentLoaded', () => {
  const ta = document.getElementById('notifMsg');
  if (ta) ta.addEventListener('input', () => {
    document.getElementById('charCount').textContent = `${ta.value.length} / 280`;
  });
});

async function sendNotification(e) {
  e.preventDefault();
  const msg  = document.getElementById('notifMsg').value.trim();
  const sent = document.getElementById('notifSent');
  const err  = document.getElementById('notifError');
  err.classList.add('hidden'); sent.classList.add('hidden');

  const res = await apiFetch('POST', '/admin/notify-all', { message: msg });
  if (res.error) { err.textContent = res.error; err.classList.remove('hidden'); }
  else { sent.classList.remove('hidden'); document.getElementById('notifMsg').value = ''; document.getElementById('charCount').textContent = '0 / 280'; }
}

/* ── AVAILABILITY MANAGEMENT ── */
async function loadAdminAvailability() {
  document.getElementById('adminSessionsList').innerHTML = '<div class="adm-loading">Loading…</div>';
  document.getElementById('adminSlotsList').innerHTML    = '<div class="adm-loading">Loading…</div>';

  const [slotsData, sessionsData] = await Promise.all([
    apiFetch('GET', '/availability/admin'),
    apiFetch('GET', '/availability/admin/sessions'),
  ]);

  // Sessions list
  const sessions = sessionsData.sessions || [];
  document.getElementById('adminSessionsList').innerHTML = sessions.length
    ? sessions.map(s => {
        const av = s.availabilityId;
        return `
          <div class="avail-slot" style="border-left-color:#9D4EDD">
            <div style="font-weight:700;color:#1B4332">${av ? `${av.date} at ${av.startTime}` : 'Date unknown'}</div>
            <div style="font-size:0.82rem;color:#718096">👤 ${s.userId?.name || '—'} (${s.userId?.email || '—'})</div>
            <div style="font-size:0.82rem;color:#718096">${s.type === 'online' ? '💻 Online' : '🏥 In-person'} · Code: ${s.confirmationCode}</div>
            <div style="display:flex;gap:0.5rem;margin-top:0.5rem;flex-wrap:wrap">
              <select onchange="updateSession('${s._id}', 'status', this.value)" style="font-size:0.78rem;padding:0.3rem 0.5rem;border:1px solid #E2E8F0;border-radius:8px">
                <option value="">Change status</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              ${s.type === 'online' ? `<button class="adm-btn-sm" onclick="addMeetingLink('${s._id}')">🔗 Add Link</button>` : ''}
            </div>
          </div>`;
      }).join('')
    : '<p style="color:#A0AEC0;font-size:0.85rem;padding:1rem">No upcoming booked sessions.</p>';

  // Slots list
  const slots = (slotsData.slots || []).filter(s => !s.isBooked);
  document.getElementById('adminSlotsList').innerHTML = slots.length
    ? slots.map(s => `
        <div class="avail-slot" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem">
          <div>
            <div style="font-weight:700;color:#1B4332">📅 ${s.date} · ${s.startTime} – ${s.endTime}</div>
            <div style="font-size:0.78rem;color:#718096">${s.type} · ${s.duration} min${s.location ? ` · 📍 ${s.location}` : ''}</div>
          </div>
          <button class="adm-btn-sm" style="background:#FEE2E2;color:#991B1B" onclick="deleteSlot('${s._id}', this)">🗑️ Delete</button>
        </div>`).join('')
    : '<p style="color:#A0AEC0;font-size:0.85rem;padding:1rem">No unbooked slots — add some above.</p>';
}

async function addSlot(e) {
  e.preventDefault();
  const btn = document.getElementById('addSlotBtn');
  const err = document.getElementById('slotError');
  btn.textContent = 'Adding…'; btn.disabled = true; err.classList.add('hidden');

  const payload = {
    date:        document.getElementById('slotDate').value,
    startTime:   document.getElementById('slotStart').value,
    endTime:     document.getElementById('slotEnd').value,
    duration:    parseInt(document.getElementById('slotDuration').value),
    type:        document.getElementById('slotType').value,
    location:    document.getElementById('slotLocation').value.trim(),
    meetingLink: document.getElementById('slotLink').value.trim(),
  };

  const res = await apiFetch('POST', '/availability/admin', payload);
  if (res.error) {
    err.textContent = res.error; err.classList.remove('hidden');
  } else {
    e.target.reset();
    loadAdminAvailability();
  }
  btn.textContent = '➕ Add Availability Slot'; btn.disabled = false;
}

async function deleteSlot(id, btn) {
  if (!confirm('Delete this slot?')) return;
  btn.disabled = true; btn.textContent = '…';
  const res = await apiFetch('DELETE', `/availability/admin/${id}`);
  if (res.error) { alert(res.error); btn.disabled = false; btn.textContent = '🗑️ Delete'; }
  else loadAdminAvailability();
}

async function updateSession(id, field, value) {
  if (!value) return;
  const res = await apiFetch('PATCH', `/availability/admin/sessions/${id}`, { [field]: value });
  if (!res.error) loadAdminAvailability();
}

async function addMeetingLink(sessionId) {
  const link = prompt('Enter meeting link (Zoom/Teams/Google Meet):');
  if (!link) return;
  const res = await apiFetch('PATCH', `/availability/admin/sessions/${sessionId}`, { meetingLink: link });
  if (res.error) alert(res.error);
  else { alert('Meeting link saved! The user has been notified.'); loadAdminAvailability(); }
}

/* ── ADMIN CHAT ── */
async function loadAdminConversations() {
  const list = document.getElementById('convoList');
  list.innerHTML = '<div class="adm-loading">Loading…</div>';
  const data = await apiFetch('GET', '/chat/admin/conversations');
  const convos = data.conversations || [];

  if (!convos.length) {
    list.innerHTML = '<div style="padding:1rem;color:#A0AEC0;font-size:0.85rem">No conversations yet.</div>'; return;
  }

  list.innerHTML = convos.map(c => `
    <div class="convo-row ${c.unread > 0 ? 'convo-unread' : ''}" onclick="openAdminConvo('${c.userId}', '${esc(c.userName)}')">
      <div class="convo-name">${c.userName} ${c.unread > 0 ? `<span class="convo-badge">${c.unread}</span>` : ''}</div>
      <div class="convo-preview">${esc(c.latestMessage || '—')}</div>
      <div class="convo-time">${c.latestAt ? timeAgo(new Date(c.latestAt)) : ''}</div>
    </div>
  `).join('');
}

async function openAdminConvo(userId, userName) {
  activeConvoId = userId;
  const main = document.getElementById('convoMain');
  main.innerHTML = `
    <div class="convo-header">
      <strong>💬 ${userName}</strong>
      <button class="adm-btn-sm" onclick="refreshAdminConvo()">↻ Refresh</button>
    </div>
    <div class="admin-chat-window" id="adminChatWin"><div class="adm-loading">Loading…</div></div>
    <div class="admin-chat-input">
      <textarea id="adminReplyInput" rows="2" placeholder="Type a reply…" maxlength="2000"
        onkeydown="adminChatKey(event)"></textarea>
      <button class="al-btn" style="width:auto;padding:0.65rem 1.2rem;margin-top:0" onclick="sendAdminReply()">Send ↑</button>
    </div>
    <p style="font-size:0.7rem;color:#A0AEC0;text-align:center;margin-top:0.25rem">Enter to send · Shift+Enter for new line</p>
  `;
  await refreshAdminConvo();

  // Poll while convo is open
  if (chatPollInt) clearInterval(chatPollInt);
  chatPollInt = setInterval(refreshAdminConvo, 5000);
}

async function refreshAdminConvo() {
  if (!activeConvoId) return;
  const win = document.getElementById('adminChatWin');
  if (!win) return;
  const data = await apiFetch('GET', `/chat/admin/conversations/${activeConvoId}`);
  const msgs = data.messages || [];
  if (!msgs.length) { win.innerHTML = '<div style="text-align:center;color:#A0AEC0;padding:1rem">No messages yet.</div>'; return; }
  win.innerHTML = msgs.map(m => `
    <div class="admin-msg ${m.sender === 'admin' ? 'admin-msg-right' : 'admin-msg-left'}">
      <div class="admin-msg-bubble">${esc(m.content).replace(/\n/g,'<br>')}</div>
      <div class="admin-msg-time">${m.sender === 'user' ? '👤 User · ' : '👩‍⚕️ You · '}${timeAgo(new Date(m.sentAt))}</div>
    </div>`).join('');
  win.scrollTop = win.scrollHeight;
  // Refresh conversation list badge
  loadAdminConversations();
}

async function sendAdminReply() {
  if (!activeConvoId) return;
  const input = document.getElementById('adminReplyInput');
  const content = input.value.trim();
  if (!content) return;
  input.disabled = true; input.value = '';
  const res = await apiFetch('POST', `/chat/admin/conversations/${activeConvoId}`, { content });
  input.disabled = false; input.focus();
  if (res.error) { alert(res.error); return; }
  await refreshAdminConvo();
}

function adminChatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAdminReply(); }
}

/* ── Admin chat badge polling ── */
async function startAdminChatBadgePoll() {
  await updateAdminChatBadge();
  setInterval(updateAdminChatBadge, 20000);
}
async function updateAdminChatBadge() {
  const data = await apiFetch('GET', '/chat/admin/unread');
  const badge = document.getElementById('sbChatBadge');
  if (!badge) return;
  const count = data.unread || 0;
  if (count > 0) { badge.textContent = count > 9 ? '9+' : count; badge.classList.remove('hidden'); }
  else badge.classList.add('hidden');
}

/* ── THERAPIST PROFILE ── */
async function loadAdminProfile() {
  const data = await apiFetch('GET', '/admin/profile');
  if (data.error) return;
  document.getElementById('pfName').value     = data.name || '';
  document.getElementById('pfTitle').value    = data.profileTitle || '';
  document.getElementById('pfBio').value      = data.profileBio || '';
  document.getElementById('pfSpecs').value    = (data.profileSpecializations || []).join(', ');
  document.getElementById('pfLangs').value    = (data.profileLanguages || []).join(', ');
  document.getElementById('pfLocation').value = data.profileLocation || '';
  document.getElementById('pfEmail').value    = data.profilePublicEmail || '';
  document.getElementById('pfPhoto').value    = data.profilePhotoUrl || '';
  document.getElementById('pfPublic').checked = data.profilePublic || false;
}

async function saveProfile(e) {
  e.preventDefault();
  const btn = document.getElementById('saveProfileBtn');
  const err = document.getElementById('profileError');
  const ok  = document.getElementById('profileSaved');
  btn.textContent = 'Saving…'; btn.disabled = true;
  err.classList.add('hidden'); ok.classList.add('hidden');

  const payload = {
    name:                   document.getElementById('pfName').value.trim(),
    profileTitle:           document.getElementById('pfTitle').value.trim(),
    profileBio:             document.getElementById('pfBio').value.trim(),
    profileSpecializations: document.getElementById('pfSpecs').value.split(',').map(s=>s.trim()).filter(Boolean),
    profileLanguages:       document.getElementById('pfLangs').value.split(',').map(s=>s.trim()).filter(Boolean),
    profileLocation:        document.getElementById('pfLocation').value.trim(),
    profilePublicEmail:     document.getElementById('pfEmail').value.trim(),
    profilePhotoUrl:        document.getElementById('pfPhoto').value.trim(),
    profilePublic:          document.getElementById('pfPublic').checked,
  };

  const res = await apiFetch('PATCH', '/admin/profile', payload);
  if (res.error) { err.textContent = res.error; err.classList.remove('hidden'); }
  else { ok.classList.remove('hidden'); setTimeout(() => ok.classList.add('hidden'), 3000); }

  btn.textContent = '💾 Save Profile'; btn.disabled = false;
}

/* ── HELPERS ── */
function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function timeAgo(date) {
  const mins = Math.floor((Date.now() - date) / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ── API HELPER ── */
async function apiFetch(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (adminToken) opts.headers['Authorization'] = `Bearer ${adminToken}`;
  if (body)       opts.body = JSON.stringify(body);
  const r = await fetch('/api' + path, opts);
  return r.json();
}
