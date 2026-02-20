# Suvidha Kiosk — Digital Citizen Services Platform

A full-stack digital kiosk for civic services in Chhattisgarh, India. Built with React + Vite (TypeScript) frontend and Express.js (TypeScript) backend.

---

## Features

- **Face Login** — Liveness-verified face recognition using face-api.js
- **Mobile OTP Login** — Twilio SMS OTP
- **QR Code Login** — Scan QR code from profile
- **Citizen Services** — Electricity, Gas, Water, Municipal, Waste, Infrastructure
- **Complaint Center** — File, track, and reopen complaints with SLA tracking
- **Appointments** — Book visits at 6 government offices
- **Announcements** — Government notices with category filters
- **Emergency SOS** — Quick access to Police (100), Ambulance (108), Fire (101), etc.
- **Feedback** — Star ratings for 7 service categories
- **Govt Schemes** — 10 real schemes (PM Awas, Ayushman Bharat, PM Kisan, etc.)
- **Certificate Applications** — 8 certificate types with fee calculation and tracking
- **RTI Filing** — Digital Right to Information applications
- **Nearby Services** — Directory of 19+ facilities in Raipur
- **Property Tax Calculator**
- **Blood Bank Finder** — GPS-based, real-time blood group availability
- **Grievance Portal** — File against 12 departments with officer assignment
- **Pension Tracker** — Check status, apply for 5 pension schemes
- **DigiLocker** — Secure digital document vault (14 document types)
- **Water Bill & Payment** — 6-month history, wallet payments
- **AI Voice/Chat Assistant** — OpenAI-powered voice and text chat in 6 languages
- **Staff / Authority / Contractor Portals** — Role-based dashboards

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Express 5, TypeScript, tsx |
| Database | PostgreSQL (Neon/Supabase compatible) via Drizzle ORM |
| Face Detection | face-api.js (client-side) |
| AI / TTS | OpenAI (tts-1, whisper-1, gpt-4o-mini) |
| SMS / OTP | Twilio |
| Auth | Session-based + face + OTP + QR |

---

## Quick Start (Local Development)

### 1. Prerequisites

- Node.js ≥ 20
- PostgreSQL database (or [Neon](https://neon.tech) free tier)
- OpenAI API key (for TTS + AI chat)
- Twilio account (for OTP — optional for local testing)

### 2. Clone & Install

```bash
git clone https://github.com/DG10911/suvidha.git
cd suvidha/Suvidha-Kioskzip/Suvidha-Kiosk
npm install
```

### 3. Configure Environment

```bash
cp ../../.env.example .env
# Edit .env and fill in all values
```

Required variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Long random string (e.g. `openssl rand -hex 32`) |
| `OPENAI_API_KEY` | OpenAI API key for TTS + AI assistant |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID (for OTP SMS) |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | Twilio phone number (e.g. `+15551234567`) |

### 4. Set Up the Database

```bash
# Push schema to database (creates all tables)
npm run db:push
```

This auto-seeds government schemes and announcements on first server start.

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5000](http://localhost:5000)

---

## How to Test

### Manual Testing Checklist

**Authentication**
- [ ] Sign up with a fake Aadhaar number (12 digits)
- [ ] Face login after signup
- [ ] Mobile OTP login (requires Twilio)
- [ ] QR code scan login

**Citizen Services**
- [ ] Electricity → Pay Bill → enter consumer ID → choose payment method
- [ ] Gas → Book Cylinder
- [ ] Municipal → Report pothole
- [ ] Complaint Center → File new complaint → check tracking

**New Features**
- [ ] Dashboard → Appointment Booking → book a slot
- [ ] Dashboard → Announcements → filter by category
- [ ] Dashboard → Emergency SOS → tap a service
- [ ] Dashboard → Govt Schemes → view PM Kisan details
- [ ] Dashboard → Certificate → apply for Income Certificate
- [ ] Dashboard → Blood Banks → sort by distance
- [ ] Dashboard → Grievance Portal → file and track
- [ ] Dashboard → DigiLocker → add Aadhaar document
- [ ] Dashboard → Water Bill → enter connection ID

**AI Assistant**
- [ ] Click the floating bot button (bottom right of any page)
- [ ] Type a message like "How do I pay my electricity bill?"
- [ ] Try voice chat (requires microphone permission)

**Role Portals**
- [ ] `/staff` — Staff dashboard (view and update complaint statuses)
- [ ] `/authority` — Authority dashboard (view escalated complaints)
- [ ] `/contractor` — Contractor dashboard (view assigned work)

### Running the Build Check

```bash
npm run check   # TypeScript type checking
npm run build   # Full production build
```

---

## Deployment — Host on Your Own Domain

### Option A: VPS (Recommended — Full Control)

Suitable for: DigitalOcean, Linode, AWS EC2, Hetzner, etc.

#### Step 1 — Provision a server

Get an Ubuntu 22.04 VPS (minimum 1GB RAM). Note its public IP address.

#### Step 2 — Install dependencies on server

```bash
# SSH into your server
ssh root@YOUR_SERVER_IP

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 (process manager)
npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install Certbot (for HTTPS / SSL)
sudo apt install -y certbot python3-certbot-nginx
```

#### Step 3 — Deploy the app

```bash
# On your local machine: build the project
cd suvidha/Suvidha-Kioskzip/Suvidha-Kiosk
npm run build

# Copy files to server (or use git clone on the server)
scp -r . root@YOUR_SERVER_IP:/var/www/suvidha/

# On server: install dependencies and set up env
cd /var/www/suvidha
npm install --production
cp /path/to/.env .env   # or create .env manually
```

#### Step 4 — Start the app with PM2

```bash
cd /var/www/suvidha
pm2 start "node dist/index.cjs" --name suvidha
pm2 startup    # Auto-start on reboot
pm2 save
```

#### Step 5 — Configure Nginx as reverse proxy

```nginx
# /etc/nginx/sites-available/suvidha
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/suvidha /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Step 6 — Point your domain to the server

In your domain registrar's DNS settings, add:
- **A record**: `@` → `YOUR_SERVER_IP`
- **A record**: `www` → `YOUR_SERVER_IP`

Wait for DNS propagation (up to 24 hours, usually 15–30 minutes).

#### Step 7 — Enable HTTPS (free SSL with Let's Encrypt)

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
# Follow prompts — certbot auto-configures Nginx for HTTPS
```

Your app will now be live at `https://yourdomain.com` ✅

---

### Option B: Railway (Easiest — No Server Management)

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click **New Project** → **Deploy from GitHub repo** → select `DG10911/suvidha`
3. Set the **Root Directory** to `Suvidha-Kioskzip/Suvidha-Kiosk`
4. Add a **PostgreSQL** database service in the same project
5. Set environment variables in Railway dashboard (copy from `.env.example`)
6. Railway auto-builds and deploys on every git push
7. Go to **Settings → Domains** → add your custom domain
8. Update DNS: add the CNAME record Railway provides

---

### Option C: Render

1. Go to [render.com](https://render.com) → **New Web Service**
2. Connect GitHub repo, set root directory to `Suvidha-Kioskzip/Suvidha-Kiosk`
3. Build command: `npm install && npm run build`
4. Start command: `npm start`
5. Add PostgreSQL via Render's database service
6. Add environment variables
7. Add custom domain in **Settings → Custom Domains**

---

### Option D: Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

cd suvidha/Suvidha-Kioskzip/Suvidha-Kiosk
fly launch           # Follow prompts
fly secrets set DATABASE_URL="..." OPENAI_API_KEY="..." SESSION_SECRET="..."
fly deploy

# Add custom domain
fly certs add yourdomain.com
```

---

## Database Schema

All tables are auto-created via `npm run db:push`. Key tables:

| Table | Purpose |
|-------|---------|
| `users` | Citizen accounts with role (citizen/staff/contractor/authority) |
| `face_profiles` | Face descriptors for face login |
| `complaints` | All service complaints with SLA tracking |
| `appointments` | Office visit bookings |
| `announcements` | Government notices |
| `govt_schemes` | 10 seeded government schemes |
| `certificate_applications` | 8 certificate types |
| `rti_applications` | RTI filings |
| `grievances` | Public grievances |
| `pension_records` | Pension registrations |
| `digi_locker` | Digital documents |
| `water_bills` | Water billing history |
| `conversations` + `messages` | AI chat history |

---

## API Overview

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/signup` | POST | Register with Aadhaar + face |
| `/api/auth/login/face` | POST | Face recognition login |
| `/api/auth/login/otp/send` | POST | Send OTP via Twilio |
| `/api/auth/login/otp/verify` | POST | Verify OTP |
| `/api/complaints` | POST | File a complaint |
| `/api/appointments` | GET/POST | List/book appointments |
| `/api/appointments/:id/cancel` | PATCH | Cancel appointment |
| `/api/feedback` | GET/POST | Ratings |
| `/api/announcements` | GET | Active notices |
| `/api/emergency` | POST | Log emergency alert |
| `/api/schemes` | GET | Government schemes |
| `/api/certificates/apply` | POST | Apply for certificate |
| `/api/rti/apply` | POST | File RTI |
| `/api/nearby-services` | GET | Public facilities directory |
| `/api/blood-banks` | GET | Blood banks with availability |
| `/api/grievances/file` | POST | File grievance |
| `/api/pension/register` | POST | Apply for pension |
| `/api/digilocker/add` | POST | Add document |
| `/api/water/bills` | GET | Water billing history |
| `/api/tts` | POST | Text-to-speech (PCM16 audio) |
| `/api/text-chat` | POST | AI assistant text chat (SSE) |
| `/api/conversations` | POST | Create voice chat session |
| `/api/conversations/:id/messages` | POST | Send voice message (SSE) |
| `/api/staff/dashboard/:userId` | GET | Staff portal data |
| `/api/authority/dashboard/:userId` | GET | Authority portal data |
| `/api/contractor/dashboard/:userId` | GET | Contractor portal data |

---

## Troubleshooting

**"DATABASE_URL must be set" error**
→ Make sure `.env` is in `Suvidha-Kioskzip/Suvidha-Kiosk/` (same folder as `package.json`)

**Face login not working**
→ Ensure HTTPS or localhost (camera requires secure context)
→ Allow camera permission in browser

**TTS/AI assistant silent**
→ Check `OPENAI_API_KEY` is set and has billing enabled
→ Check browser console for errors

**OTP not received**
→ Verify Twilio credentials and phone number format (+91XXXXXXXXXX for India)

**Build fails**
→ Run `npm run check` for TypeScript errors
→ Ensure Node.js ≥ 20
