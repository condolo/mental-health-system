# Developer Guide — Embracing The Journey Within v2.1

---

## Project Structure

```
Mental_health_app/
├── server.js                  # Express server entry point
├── package.json               # Dependencies & scripts
├── .env.example               # Environment variable template
├── .env                       # Your local env (never commit this)
│
├── middleware/
│   └── auth.js                # JWT auth middleware (user + admin)
│
├── models/
│   ├── User.js                # User schema (auth, notifications, therapist profile fields)
│   ├── Entry.js               # Daily journal entry schema
│   ├── Event.js               # Therapeutic event schema
│   ├── Booking.js             # Event booking schema
│   ├── Message.js             # Private chat messages
│   ├── Availability.js        # Therapist availability slots
│   └── Session.js             # 1-to-1 session bookings
│
├── routes/
│   ├── auth.js                # Register, login, profile, notifications
│   ├── entries.js             # Save/get journal entries
│   ├── events.js              # List events, book, cancel, my bookings
│   ├── analytics.js           # Daily insight, weekly report engine
│   ├── chat.js                # User ↔ admin private messaging
│   ├── availability.js        # Slot management + 1-to-1 session booking
│   └── admin.js               # Admin-only: stats, events, profile, notify
│
├── index.html                 # Main user SPA
├── style.css                  # All user-facing styles
├── app.js                     # All user-facing JavaScript
│
├── admin.html                 # Admin dashboard SPA
├── admin.css                  # Admin dashboard styles
├── admin.js                   # Admin dashboard JavaScript
│
├── CHANGELOG.md               # Version history
├── USER_GUIDE.md              # End-user documentation
└── DEVELOPER_GUIDE.md         # This file
```

---

## Setup & Installation

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier is sufficient)
- Git

### Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/condolo/mental-health-system.git
cd mental-health-system

# 2. Install dependencies
npm install

# 3. Create your .env file
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secret, etc.

# 4. Create the admin account (one-time only)
# Start the server first, then:
curl -X POST http://localhost:3000/api/auth/setup

# 5. Start development server
npm run dev   # uses nodemon for auto-restart
# or
npm start     # production
```

### Environment Variables (`.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | ✅ | MongoDB Atlas connection string |
| `JWT_SECRET` | ✅ | Long random string for signing JWTs |
| `PORT` | ❌ | Server port (default 3000, set by Render) |
| `ADMIN_EMAIL` | ✅ | Admin account email (used by /setup) |
| `ADMIN_PASSWORD` | ✅ | Admin account password (used by /setup) |
| `ADMIN_NAME` | ❌ | Admin display name |
| `EMAIL_USER` | ❌ | Gmail for email notifications |
| `EMAIL_PASS` | ❌ | Gmail App Password |
| `APP_URL` | ❌ | Deployed app URL |

---

## API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | None | Create user account |
| POST | `/api/auth/login` | None | Login, returns JWT |
| GET  | `/api/auth/me` | User | Get current user profile |
| GET  | `/api/auth/notifications` | User | Get notification list |
| PATCH | `/api/auth/notifications/read` | User | Mark all notifications read |
| POST | `/api/auth/setup` | None | Create admin (one-time) |

### Journal Entries

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/entries` | User | Save / update today's entry |
| GET  | `/api/entries/today` | User | Get today's entry |
| GET  | `/api/entries` | User | Get last 90 entries |

### Events

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET    | `/api/events` | User | List all upcoming events |
| POST   | `/api/events/:id/book` | User | Book an event |
| DELETE | `/api/events/:id/book` | User | Cancel a booking |
| GET    | `/api/events/my-bookings` | User | User's confirmed bookings |

### Analytics

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/analytics/daily` | User | Daily insight (today vs yesterday) |
| GET | `/api/analytics/weekly` | User | 7-day wellness report |

### Chat

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET  | `/api/chat` | User | Get my chat history (marks admin msgs read) |
| POST | `/api/chat` | User | Send message to therapist |
| GET  | `/api/chat/unread` | User | Unread admin message count |
| GET  | `/api/chat/admin/conversations` | Admin | List all user conversations |
| GET  | `/api/chat/admin/conversations/:userId` | Admin | Full thread with user |
| POST | `/api/chat/admin/conversations/:userId` | Admin | Reply to user |
| GET  | `/api/chat/admin/unread` | Admin | Total unread user messages |

### Availability & Sessions

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET  | `/api/availability` | User | Available (unbooked, future) slots grouped by date |
| POST | `/api/availability/:id/book` | User | Book a session slot |
| DELETE | `/api/availability/:sessionId/cancel` | User | Cancel a session |
| GET  | `/api/availability/my-sessions` | User | My booked sessions |
| POST | `/api/availability/admin` | Admin | Create availability slot |
| GET  | `/api/availability/admin` | Admin | All slots (booked + available) |
| DELETE | `/api/availability/admin/:id` | Admin | Delete unbooked slot |
| GET  | `/api/availability/admin/sessions` | Admin | All upcoming sessions |
| PATCH | `/api/availability/admin/sessions/:id` | Admin | Update session notes/link/status |

### Admin (role: admin only)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET  | `/api/admin/stats` | Admin | Anonymous platform statistics + DAU |
| GET  | `/api/admin/events` | Admin | All events with booking counts |
| POST | `/api/admin/events` | Admin | Create event + notify all users |
| PATCH | `/api/admin/events/:id` | Admin | Update event (status, link, etc.) |
| GET  | `/api/admin/events/:id/bookings` | Admin | Attendee list (name+email only) |
| POST | `/api/admin/notify-all` | Admin | Broadcast notification to all users |
| GET  | `/api/admin/profile` | Admin | Get therapist profile |
| PATCH | `/api/admin/profile` | Admin | Update therapist profile |
| GET  | `/api/admin/therapist-profile` | Public | Public therapist profile (when profilePublic=true) |

---

## Data Models

### User
```
name, email, password (hashed), role, isActive, entryCount,
discountCode, notifications[], lastActive, createdAt
```

### Entry
```
userId, date, dateString (YYYY-MM-DD),
mood { idx, emoji, label, score },
moodNote, gratitude[], affirmations[], customAffirm,
selfcare[], selfcareCount, scOther,
stressLevel, stressSource, copingMethods[], copingNote, afterCoping,
keyLesson, intention, dayWord,
completed, completedAt, overallScore, createdAt
```

### Event
```
title, description, therapistName, eventDate, duration, type,
category, price, discountedPrice, discountPercent, capacity,
bookedCount, platform, meetingLink, imageEmoji, status,
notificationSent, createdBy, createdAt
```

### Booking
```
userId, eventId, status, appliedDiscount, discountCode,
finalPrice, confirmationCode, bookedAt
```

### Message
```
userId, sender ('user'|'admin'), content, read, sentAt
```
Indexes: `{ userId, sentAt }` for fast conversation fetch

### Availability
```
date (YYYY-MM-DD), startTime, endTime, duration, type ('online'|'in-person'|'both'),
location, meetingLink, isBooked, bookedBy, createdBy, createdAt
```

### Session
```
userId, availabilityId, status ('confirmed'|'cancelled'|'completed'),
type ('online'|'in-person'), confirmationCode (SES-XXXXXXXX),
notes (admin-only), meetingLink, bookedAt
```

---

## Security Architecture

### Privacy by Design
- User journal entries are stored with `userId` — queries always include `{ userId: req.user.id }`
- Admin routes **never** query Entry model with individual user IDs
- Admin can only see: anonymous aggregates, event booking attendee names/emails
- `Entry.select('-userId')` ensures userId is never returned in API responses

### Authentication
- JWTs signed with `JWT_SECRET`, expire in 30 days
- `middleware/auth.js` verifies token on every protected route
- `auth.adminOnly` additionally checks `role === 'admin'`
- Passwords hashed with bcrypt, 12 salt rounds

### Rate Limiting
- 100 requests per 15 minutes per IP on all `/api/` routes
- Prevents brute-force attacks on login endpoint

### HTTP Security
- `helmet` middleware sets security headers (CSP, HSTS, X-Frame-Options, etc.)

---

## Deployment (Render)

1. Push all files to GitHub
2. Create a **Web Service** on Render
3. Connect your GitHub repo
4. Set environment variables in Render dashboard
5. Build command: `npm install`
6. Start command: `node server.js`
7. After first deploy, call `POST /api/auth/setup` once to create the admin account
8. Admin dashboard is at: `https://your-app.onrender.com/admin`

### MongoDB Atlas Setup
1. Go to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a free cluster
3. Create a database user
4. Whitelist `0.0.0.0/0` in Network Access (for Render)
5. Copy the connection string to `MONGODB_URI` in your `.env`

---

## Analytics Engine Logic

### Mood Score Mapping
```
Joyful=10, Happy=9, Loved=9, Calm=8, Reflective=6,
Neutral=5, Sad=2, Anxious=2, Frustrated=3, Exhausted=4
```

### Overall Score Formula
```
overallScore = (moodScore + (11 - stressLevel) + selfcareCount) / 3
```

### Weekly Alert Levels
| Condition | Alert |
|-----------|-------|
| avgStress ≥ 7 OR avgMood ≤ 4 | 🔴 Red — recommend therapist |
| avgStress ≥ 5 OR avgMood ≤ 6 | 🟡 Yellow — coping suggestions |
| All positive | 🟢 Green — celebrate progress |

---

## Active Member System
- Triggered in `User.checkAndPromote()` after every completed entry
- Condition: `entryCount >= 10 && !isActive`
- On promotion: `isActive = true`, discount code generated, achievement notification pushed
- Discount code format: `ACTIVE-` + last 6 chars of MongoDB `_id` (uppercase)
