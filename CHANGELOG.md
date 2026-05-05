# Changelog — Embracing The Journey Within

All notable changes to this project are documented here.
Format: `[Version] — Date — Description`

---

## [2.1.0] — 2026-05-05 — Chat, Session Booking, Therapist Profile & PDF Reports

### 🚀 Major Features Added

#### 🗓️ 1-to-1 Session Booking with Therapist
- Therapist can create availability slots (date, start/end time, duration, type, location, meeting link)
- Users see only **unbooked, future** slots — booked slots disappear from view automatically
- Users can choose Online or In-person when booking (where slot allows both)
- Booking confirms instantly, generates a unique code (`SES-XXXXXXXX`), and sends a notification
- Cancellation frees the slot back up
- Admin can view all upcoming sessions, mark as completed/cancelled, add Zoom/Meet links
- New `Availability`, `Session` models added to MongoDB

#### 💬 Private Secure Chat
- 1-to-1 encrypted messaging between each user and the therapist
- User view: persistent chat window with confidentiality notice, message history, 5-second polling when open
- Admin view: conversation list with unread badge, full thread per user, reply from dashboard
- All messages marked read when viewed; unread badge on chat icon in nav bar and menu
- Admin chat sidebar link shows live unread count badge
- New `Message` model added (`userId`, `sender`, `content`, `read`, `sentAt`)
- 30-second background badge polling so users know when therapist has replied

#### 👩‍⚕️ Therapist Public Profile
- Admin can set their profile: name, title, bio, specializations, languages, location, public email, photo URL
- Profile is only shown to users when admin toggles "Make profile visible"
- Displayed as a beautiful profile card in the app's "Your Therapist" section
- Quick-action buttons: "Send a Message" → chat, "Book a Session" → availability booking
- PATCH `/api/admin/profile` (admin only) — GET `/api/admin/therapist-profile` (public for users)

#### 📄 Weekly Report PDF Download
- "Download Report" button on the Weekly Insights page
- Generates a professionally branded A4 PDF client-side using jsPDF (no server required)
- Includes: header branding, confidentiality banner, 4 stat boxes (mood/stress/self-care/entries), chart image, mood trend, suggestions
- Filename: `Wellness_Report_YYYY-MM-DD.pdf`
- Free for all users now (freemium — premium gate can be toggled later)

#### 📊 Admin Daily Active Users
- New 7-day "Daily Active Users" bar chart on admin Overview dashboard
- Tracks via `lastActive` field updated on every journal sync and message sent
- Shown alongside the existing daily check-ins chart
- Stats grid expanded: now includes upcoming 1-to-1 sessions count + unread messages count

### 🛠 Technical Changes
- Added `models/Message.js`, `models/Availability.js`, `models/Session.js`
- Updated `models/User.js` with 8 therapist profile fields + `profilePublic` flag
- Added `routes/chat.js` — user + admin chat endpoints
- Added `routes/availability.js` — slot management + session booking (user + admin)
- Updated `routes/admin.js` — profile CRUD + therapist-profile public endpoint + enriched stats
- Updated `server.js` — mounted `/api/chat` and `/api/availability`
- Updated `index.html` — new sections: Therapist Profile, Chat, My Sessions; jsPDF CDN added
- Updated `app.js` — chat polling, PDF generation, availability booking, session management, profile rendering
- Updated `admin.html` — 3 new panels: Availability, Messages, My Profile; DAU chart
- Updated `admin.js` — all admin panel logic for the 3 new panels, helper functions
- Updated `admin.css` — chat layout, convo list, admin message bubbles, slot styles
- Updated `style.css` — chat window, bubbles, therapist card, session slots, PDF button

### 🔒 Data Protection & Confidentiality
- Clinical confidentiality notice shown in chat before first message
- Session booking confidentiality banner
- PDF includes "Private and Confidential" disclaimer on every page
- Admin profile endpoint strictly admin-only for writes; public read returns zero private data
- Session notes (admin-only) never sent to users
- All message queries always scoped to `userId` — users can never see other users' chats

---

## [2.0.0] — 2026-05-04 — Full Platform Launch

### 🚀 Major Features Added

#### Authentication & User Accounts
- Register/Login screens with JWT token authentication (30-day sessions)
- Secure password hashing with bcryptjs (12 salt rounds)
- Private user profiles — each user's data is completely isolated
- `/api/auth/setup` one-time endpoint to create the admin account

#### Private Data Storage (MongoDB)
- All journal entries stored per-user in MongoDB Atlas
- Entries sync to server on every section advance and on completion
- localStorage used as offline cache / fallback
- Entry data is never accessible to the admin (by architecture)

#### Daily & Weekly Insights Engine
- **Daily Insight**: compares today's mood, stress and self-care to yesterday
- **Weekly Report**: 7-day trend analysis with mood trend (improving/stable/declining)
- Anonymous aggregate composite score (mood + stress-inverted + self-care / 3)
- Smart suggestion engine:
  - 🔴 Red alert: avg stress ≥ 7 or avg mood ≤ 4 → recommend therapist
  - 🟡 Yellow alert: moderate stress or mixed mood → coping suggestions
  - 🟢 Green: positive trends → celebrate with user
- Chart.js line graph showing 7-day mood, stress, self-care trends
- Post-completion insight popup after daily check-in

#### Events & Sessions System
- Users see all upcoming events: therapy sessions, mental health talks, workshops, support groups, meditation, webinars
- One-tap booking with automatic confirmation code (format: `JTW-XXXXXXXX`)
- Cancel booking option
- My Bookings page showing confirmed sessions with meeting links
- Spot counter (live capacity tracking)

#### Active Member Discount System
- Users who complete 10+ check-ins are automatically promoted to **Active Member**
- Active members receive a unique discount code (`ACTIVE-XXXXXX`)
- Discount is automatically applied when booking premium events (default 20% off)
- Achievement notification sent when status is unlocked

#### Notification System
- Bell icon in header with unread badge count
- Slide-out notification panel
- Notifications sent for: new events, booking confirmations, achievements, system messages
- Admin can broadcast custom messages to all users
- Mark-all-read functionality

#### Admin Dashboard (`/admin`)
- Separate protected login (admin role only)
- **Overview**: total users, active members, entries, upcoming events, bookings
- **7-day activity bar chart** (anonymous entry counts per day)
- **Anonymous aggregates**: avg mood score, avg stress, avg overall score — zero private data
- **Events Management**: create, view, update status, view attendees (name + email only)
- **Create Event**: full form with title, therapist, date/time, type, pricing, discount, platform, capacity, meeting link
- **Broadcast Notifications**: send a message to all registered users
- When admin creates an event, all users are immediately notified

### 🛠 Technical Changes
- Added `mongoose`, `bcryptjs`, `jsonwebtoken`, `nodemailer`, `cors`, `express-rate-limit`, `helmet` dependencies
- Added `middleware/auth.js` — user auth + admin-only middleware
- Added `models/User.js`, `models/Entry.js`, `models/Event.js`, `models/Booking.js`
- Added `routes/auth.js`, `routes/entries.js`, `routes/events.js`, `routes/analytics.js`, `routes/admin.js`
- Added `admin.html` + `admin.css` + `admin.js` — standalone therapist dashboard
- Added `Chart.js` (CDN) for weekly wellness charts
- Added `helmet` for HTTP security headers
- Rate limiting: 100 requests per 15 minutes per IP on all `/api/` routes

### 🎨 UI/UX Changes
- Auth screen (login/register) shown before splash when not authenticated
- Notification bell in header with live badge count
- Events tab in bottom navigation
- Insights tab in bottom navigation
- Side menu updated with Events, My Bookings, Insights, Sign Out links
- Menu shows logged-in user's name
- Active Member badge shown on events page
- Insight popup on completion screen when suggestions exist

---

## [1.1.0] — 2026-05-04 — Self-Care & Quotes Expansion

### Added
- Self-care item: **Did something I enjoy** (🎉)
- Self-care item: **Others** (✏️) — with free-text input that reveals when checked
- 40+ motivational quotes including deep emotional ones:
  - *"It may look like everything is over. Hold on. There is light at the end of the tunnel."*
  - *"You have walked through fire before — and you came out the other side."*
  - *"What feels like the end is often just a painful, necessary turning point."*
- Quotes grouped into 3 categories: Hope in the Dark, Healing & Self-Worth, Growth & Becoming

---

## [1.0.0] — 2026-05-04 — Initial Release

### Features
- Splash screen with animated floating flowers, brand identity
- 6-section daily check-in flow:
  1. **Mood Tracker** — 10 emoji moods with optional note
  2. **Gratitude Garden** — 3 daily gratitudes
  3. **Affirmations** — 12 preset + custom "I am…" statement
  4. **Self-Care Checklist** — 8 habits with live score/progress bar
  5. **Stress & Coping** — 1–10 slider, stress source, coping methods, 4-7-8 breathing exercise
  6. **My Reflection** — key lesson, tomorrow's intention, one word for the day
- Completion screen with confetti animation + summary card
- History page showing past entries from localStorage
- Progress ring in header (fills as sections complete)
- Side menu navigation
- Bottom navigation bar (5 tabs)
- Day streak tracker
- Daily quote of the day
- Responsive design (mobile-first, tablet-friendly)
- localStorage-based data persistence (offline-capable)
- `server.js` and `package.json` for Render deployment
