# Suvidha Kiosk — Digital Citizen Services Platform

A full-stack digital kiosk for civic services in Chhattisgarh, India.  
**React + Vite (TypeScript) frontend · Express.js (TypeScript) backend · PostgreSQL · OpenAI**

---

## ⚡ Quickest Way to Run (5 minutes)

```bash
# 1. Clone
git clone https://github.com/DG10911/suvidha.git
cd suvidha/Suvidha-Kioskzip/Suvidha-Kiosk

# 2. Run setup script (installs deps, creates .env)
bash setup.sh

# 3. Start a local PostgreSQL database (Docker required)
docker compose up -d

# 4. Edit .env — set DATABASE_URL and OPENAI_API_KEY (see below)
#    DATABASE_URL is already set correctly if you used docker compose above

# 5. Push the database schema (run once)
npm run db:push

# 6. Start the app
npm run dev
```

Open **http://localhost:5000** in your browser.

> **No Docker?** Use [Neon.tech](https://neon.tech) free cloud PostgreSQL instead — sign up, create a project, paste the connection string as `DATABASE_URL` in `.env`.

---

## Environment Variables

Edit `Suvidha-Kioskzip/Suvidha-Kiosk/.env` (created by `setup.sh`):

| Variable | Required | Where to get it |
|----------|----------|----------------|
| `DATABASE_URL` | ✅ Yes | **Local dev only:** `postgresql://suvidha:suvidha@localhost:5432/suvidha` · Cloud: [neon.tech](https://neon.tech) · ⚠️ Use a strong password in production |
| `SESSION_SECRET` | ✅ Yes | Run `openssl rand -hex 32` to generate — ⚠️ never use the default value in production |
| `OPENAI_API_KEY` | ✅ Yes (for TTS + AI chat) | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| `TWILIO_ACCOUNT_SID` | ⬜ Optional | [console.twilio.com](https://console.twilio.com) |
| `TWILIO_AUTH_TOKEN` | ⬜ Optional | Same as above |
| `TWILIO_PHONE_NUMBER` | ⬜ Optional | A Twilio number like `+15551234567` |
| `PORT` | ⬜ Optional | Default `5000` |

> **Without Twilio:** Mobile OTP login will show an error, but all other features (Face Login, QR Login, and everything on the dashboard) work fine.

> **Without OpenAI:** Voice assistant and text-to-speech will be silent, but all other features work fine.

---

## Manual Setup (no Docker)

```bash
# Install Node.js 20+ from https://nodejs.org
node --version   # should show v20.x or higher

# Go to the app folder
cd suvidha/Suvidha-Kioskzip/Suvidha-Kiosk

# Install dependencies
npm install

# Create .env
cp ../../.env.example .env
# Edit .env — fill in DATABASE_URL, SESSION_SECRET, OPENAI_API_KEY

# Create database tables
npm run db:push

# Start development server (auto-reloads on changes)
npm run dev
```

Open **http://localhost:5000**

---

## How to Test

### 1. Sign Up (create your first account)

1. Go to **http://localhost:5000**
2. Click **"Sign Up"** (blue card — "New Citizen")
3. Enter **any 12-digit number** as Aadhaar e.g. `123456789012`  
   *(The app generates a fake profile from the Aadhaar number — no real data needed)*
4. Your name, phone, DOB are auto-filled
5. Click "Proceed" → follow face capture steps (allow camera)
6. On success you'll land on the **Dashboard**

### 2. Log In Again (next time)

| Method | How |
|--------|-----|
| **Face Login** | Home → "Face Login" → look at camera |
| **Mobile OTP** | Home → "Mobile Login" → enter phone from signup → enter OTP (requires Twilio) |
| **QR Code** | Home → "Scan QR" → scan your profile QR code |

### 3. Test Each Feature

Navigate from the Dashboard:

| Feature | How to test |
|---------|-------------|
| **Electricity** | Dashboard → Electricity → "Pay Bill" → enter any Consumer ID e.g. `1234567890` |
| **Gas** | Dashboard → Gas Services → "Book Cylinder" |
| **Complaint** | Dashboard → Complaint Center → fill form → submit |
| **Appointments** | Dashboard → Appointments → pick office, date, slot |
| **Announcements** | Dashboard → Announcements → filter by category |
| **Emergency SOS** | Dashboard → Emergency SOS → tap any service |
| **Govt Schemes** | Dashboard → Govt Schemes → view PM Kisan details |
| **Certificates** | Dashboard → Certificates → apply for Income Certificate |
| **RTI Filing** | Dashboard → RTI → fill form, submit |
| **Nearby Services** | Dashboard → Nearby Services → search "hospital" |
| **Property Tax** | Dashboard → Property Tax → enter property details |
| **Blood Banks** | Dashboard → Blood Banks → filter by blood group |
| **Grievance** | Dashboard → Grievance Portal → file and get a Grievance ID |
| **Pension** | Dashboard → Pension Tracker → enter Aadhaar |
| **DigiLocker** | Dashboard → DigiLocker → add Aadhaar document |
| **Water Bill** | Dashboard → Water Bill → enter `WB001` as connection ID |
| **AI Assistant** | Any page → floating bot button (bottom right) → type a question |
| **Staff Portal** | Go to **http://localhost:5000/staff** |
| **Authority Portal** | Go to **http://localhost:5000/authority** |
| **Contractor Portal** | Go to **http://localhost:5000/contractor** |

### 4. Test with Different Languages

Top-right of any page → Globe icon → choose Hindi / छत्तीसगढ़ी / Marathi / Telugu / Tamil.  
*(TTS voice changes language too if OPENAI_API_KEY is set)*

### 5. Accessibility Features

Top-right → Accessibility icon (person) → toggle High Contrast, Large Text, Screen Reader mode.

---

## Build for Production

```bash
cd suvidha/Suvidha-Kioskzip/Suvidha-Kiosk

# Build client + server into dist/
npm run build

# Start production server
NODE_ENV=production node dist/index.cjs
```

---

## Deploy to Your Domain

### Option A: VPS (DigitalOcean / Linode / AWS EC2)

```bash
# On your server — install Node 20, PM2, Nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs nginx
npm install -g pm2

# Deploy
git clone https://github.com/DG10911/suvidha.git /var/www/suvidha
cd /var/www/suvidha/Suvidha-Kioskzip/Suvidha-Kiosk
npm install
# Create .env with your production values
npm run db:push
npm run build

# Start with PM2
pm2 start "node dist/index.cjs" --name suvidha
pm2 startup && pm2 save
```

**Nginx config** (`/etc/nginx/sites-available/suvidha`):
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/suvidha /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Free HTTPS with Let's Encrypt
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

**DNS**: Add an **A record** pointing `yourdomain.com` → your server's IP address.

---

### Option B: Railway (Easiest — no server management)

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
2. Select `DG10911/suvidha`, set **Root Directory** to `Suvidha-Kioskzip/Suvidha-Kiosk`
3. Add a **PostgreSQL** database plugin in the same project
4. Set env vars in Railway dashboard (DATABASE_URL is auto-injected)
5. Railway auto-builds and deploys on every push
6. **Settings → Domains** → Add custom domain → add the CNAME in your DNS

---

### Option C: Render

1. [render.com](https://render.com) → **New Web Service** → connect GitHub
2. Root directory: `Suvidha-Kioskzip/Suvidha-Kiosk`
3. Build: `npm install && npm run build` · Start: `npm start`
4. Add a **PostgreSQL** database, copy the internal URL to `DATABASE_URL`
5. Add other env vars, then **Settings → Custom Domains**

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `DATABASE_URL must be set` | Create/edit `.env` in `Suvidha-Kioskzip/Suvidha-Kiosk/` folder |
| `Cannot connect to database` | Make sure PostgreSQL is running: `docker compose up -d` |
| Face login doesn't open camera | Must use `https://` or `localhost` (camera API requires secure context) |
| TTS / AI assistant silent | Check `OPENAI_API_KEY` is set and has billing enabled |
| OTP not received | Twilio credentials missing or phone format wrong — use `+91XXXXXXXXXX` for India |
| Port already in use | Change `PORT=5001` in `.env` |
| `npm run db:push` fails | Check your `DATABASE_URL` is reachable and correct |

---

## Project Structure

```
Suvidha-Kioskzip/Suvidha-Kiosk/
├── client/src/
│   ├── pages/          ← All UI pages (Dashboard, FaceLogin, etc.)
│   ├── components/     ← Shared components (KioskLayout, VoiceAgent, etc.)
│   └── lib/            ← Utilities (faceUtils, speechHelper, translations)
├── server/
│   ├── index.ts        ← Express entry point
│   ├── routes.ts       ← All API routes + auto-seeding logic
│   ├── twilio.ts       ← OTP via Twilio
│   └── replit_integrations/
│       ├── audio/      ← TTS (tts-1) + voice chat (whisper-1 + gpt-4o-mini)
│       └── chat/       ← Chat storage + AI routes
├── shared/schema.ts    ← Drizzle ORM schema (all DB tables)
├── db/index.ts         ← DB connection
├── setup.sh            ← First-time setup script
├── docker-compose.yml  ← Local PostgreSQL
└── .env.example        ← Environment variable template
```

---

## Features

- **Face Login** — Liveness-verified (5-step anti-spoof)
- **Mobile OTP** — Twilio SMS
- **QR Code Login**
- **Complaint Center** — File, track, SLA countdown
- **14 Dashboard Services** — Appointments, Schemes, Certificates, RTI, Blood Banks, Grievance, Pension, DigiLocker, Water Bill, and more
- **AI Voice/Chat Assistant** — Whisper STT + GPT-4o-mini + TTS-1, 6 languages
- **Staff / Authority / Contractor Portals** — Role-based dashboards
- **6 Languages** — English, Hindi, Chhattisgarhi, Marathi, Telugu, Tamil
