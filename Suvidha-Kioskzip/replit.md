# Suvidha Kiosk

## Overview
A digital civic services kiosk application built with React, Vite, TypeScript, and Tailwind CSS. Provides citizen services like electricity, water, gas, waste management, and more through a touch-friendly kiosk interface.

## Recent Changes
- **Feb 2026**: Improved face recognition with multi-frame averaging (3 frames), fallback input sizes (512/416/320), relaxed threshold (0.6)
- **Feb 2026**: Seeded 100 sample Aadhaar users with full details, QR tokens, wallets - NO face registered (face login available after signup)
- **Feb 2026**: Auto-seed 100 users on server startup if database has fewer than 100 users (idempotent)
- **Feb 2026**: Added face registration in Profile page (for users who skipped face scan during signup) with webcam modal and re-scan option
- **Feb 2026**: Added permanent QR code display in Profile with user name, Suvidha ID, and Print Suvidha Pass button
- **Feb 2026**: Added API endpoints: GET /api/user/:userId/qr-token, POST /api/user/:userId/register-face, GET /api/user/:userId/face-status
- **Feb 2026**: Implemented real SMS OTP via Twilio - sends 6-digit OTP to phone, 5-min expiry, resend with 30s cooldown, loading states
- **Feb 2026**: Fixed QR login session restore - correctly reads userName/userId from server response
- **Feb 2026**: Replaced SHA256 face matching with face-api.js (128-d facial descriptor vectors) - real face recognition now works across different captures
- **Feb 2026**: Added server-side Aadhaar lookup API (/api/aadhaar/lookup/:aadhaar) that generates unique citizen details for any 12-digit number
- **Feb 2026**: Added authentication guards - mobile login rejects unregistered numbers with "sign up first" message
- **Feb 2026**: Auto-fetches mobile number, name, DOB, address from Aadhaar during signup (server-side)
- **Feb 2026**: Added /api/auth/check-user/:identifier endpoint to verify if user exists before login
- **Feb 2026**: Signup now detects duplicate Aadhaar registrations and shows error
- **Feb 2026**: Face models (tinyFaceDetector + faceLandmark68Tiny + faceRecognition) loaded from /models/
- **Feb 2026**: Added offline support with service worker (sw.js) - caches static assets, API responses for offline fallback
- **Feb 2026**: Wired all frontend pages to real PostgreSQL API endpoints via async kioskStore functions with localStorage fallback
- **Feb 2026**: Added Leaflet map location picker in Complaint Center for pinning complaint location on OpenStreetMap
- **Feb 2026**: Built Wallet page with real API-backed balance display, add money via UPI QR code, transaction history
- **Feb 2026**: Implemented real QR code generation (qrcode library) during signup, validation on login via /api/auth/qr-validate
- **Feb 2026**: Implemented real webcam face capture during signup with face-api.js descriptor extraction for login
- **Feb 2026**: Built 21 RESTful API endpoints for auth, complaints CRUD, wallet, notifications, documents, linked services
- **Feb 2026**: Designed comprehensive PostgreSQL schema with 12 tables using Drizzle ORM (users, face_profiles, qr_tokens, complaints, wallet, etc.)
- **Feb 2026**: Built dedicated Complaint Center page with Register Complaint (6 service categories), Check Status (ticket lookup + timeline), and Reopen Ticket features
- **Feb 2026**: Added dedicated Electricity Service page with bill pay (consumer ID lookup, UPI/Cash/Wallet), new connection, outage reporting, meter fault, billing correction
- **Feb 2026**: Added dedicated Gas Service page with cylinder booking (3 types), bill pay, leakage emergency (1906 helpline), new connection, delivery tracking, subsidy status
- **Feb 2026**: Added dedicated Municipal Service page with Water/Waste/Infrastructure tabs, water bill pay, new connection, leak/quality reports, waste pickup/bulk, pothole/streetlight/drainage
- **Feb 2026**: Created reusable PaymentFlow component (UPI portal with QR, cash insert, Suvidha wallet) with processing animation and receipt printing
- **Feb 2026**: Added 93 new translation keys for all service pages in English and Hindi
- **Feb 2026**: Added QR code camera scanning with html5-qrcode library, /api/qr-validate endpoint, manual ID fallback when camera unavailable
- **Feb 2026**: Replaced browser speechSynthesis (broken in iframe) with server-side TTS via OpenAI gpt-audio + AudioContext playback for screen reader mode
- **Feb 2026**: Added /api/tts endpoint with server-side audio caching, client-side speechHelper.ts with AudioContext PCM16 playback
- **Feb 2026**: Added visual announcement bar (blue toast) and "Voice ON" header badge for screen reader mode
- **Feb 2026**: Redesigned Dashboard as Personalized Unified Dashboard with welcome banner, service tiles, AI assistant, and quick access sections
- **Feb 2026**: Added Municipal Services mega-tile (Water, Waste, Infrastructure sub-services)
- **Feb 2026**: Built kioskStore.ts centralized localStorage persistence layer with event-driven updates for all dashboard pages
- **Feb 2026**: Rebuilt My Requests page with filter/sort (date/urgency/SLA), search, live SLA countdown timer, expandable timeline, reopen with reason
- **Feb 2026**: Rebuilt Documents page with view modal, formatted print window, text file download, type filters (Receipt/Payment/Certificate/Complaint/Application)
- **Feb 2026**: Rebuilt Notifications page with mark read/all read, delete with animation, type filters, live badge sync
- **Feb 2026**: Rebuilt Profile page with stats dashboard, link/unlink services (consumer ID), login methods, session info
- **Feb 2026**: Wired Dashboard with live notification badges and active request counts from kioskStore
- **Feb 2026**: Updated AI agent system prompt with comprehensive knowledge of all 8 service areas, payment methods, accessibility, emergency contacts
- **Feb 2026**: Added Notifications page with payment confirmations, status updates, emergency alerts
- **Feb 2026**: Added Profile & Preferences page with linked services, login methods management
- **Feb 2026**: Added AI Smart Assistant floating button with chat interface
- **Feb 2026**: Moved username and logout to header (top); removed Home button when logged in
- **Feb 2026**: Added 70+ new translation keys across all 6 languages
- **Feb 2026**: Expanded service subcategories (electricity, gas, water, waste, infrastructure)
- **Feb 2026**: Added proper print layouts for Suvidha Pass card and complaint receipts
- **Feb 2026**: Implemented multi-language translation system (English, Hindi, Chhattisgarhi, Marathi, Telugu, Tamil)
- **Feb 2026**: Added Face Scan registration during signup flow and Face Login option
- **Feb 2026**: Made language and accessibility settings persistent with per-user preferences

## Project Architecture
- **Frontend**: React 19 + Vite 7 + TypeScript + Tailwind CSS v4
- **UI**: shadcn/ui components (Radix primitives)
- **Routing**: wouter
- **Animations**: framer-motion
- **State**: React Query + localStorage for user preferences
- **Server**: Express + Vite middleware (full-stack mode on port 5000)
- **AI**: OpenAI integration via Replit AI Integrations (gpt-4o-audio, gpt-4o-mini-transcribe)
- **Database**: PostgreSQL (Neon-backed) with Drizzle ORM for conversation storage

### Key Files
- `Suvidha-Kiosk/client/src/App.tsx` - Router with all routes
- `Suvidha-Kiosk/client/src/pages/Home.tsx` - Home page with 4 login options
- `Suvidha-Kiosk/client/src/pages/Signup.tsx` - Aadhaar signup with face scan step
- `Suvidha-Kiosk/client/src/pages/FaceLogin.tsx` - Face scan login page
- `Suvidha-Kiosk/client/src/pages/Login.tsx` - Mobile/QR login
- `Suvidha-Kiosk/client/src/pages/Dashboard.tsx` - Personalized unified dashboard with all service tiles
- `Suvidha-Kiosk/client/src/pages/MyRequests.tsx` - Request status tracker with SLA countdown
- `Suvidha-Kiosk/client/src/pages/Documents.tsx` - Documents & receipts management
- `Suvidha-Kiosk/client/src/pages/Notifications.tsx` - Alerts & notifications center
- `Suvidha-Kiosk/client/src/pages/Profile.tsx` - Profile, linked services, login methods
- `Suvidha-Kiosk/client/src/pages/ComplaintCenter.tsx` - Complaint Center with register, check status, reopen ticket
- `Suvidha-Kiosk/client/src/components/layout/KioskLayout.tsx` - Shared layout with language/accessibility controls
- `Suvidha-Kiosk/client/src/lib/userPreferences.ts` - Per-user preferences & face registration store
- `Suvidha-Kiosk/client/src/lib/translations.ts` - Multi-language translation system (6 languages, 130+ keys)
- `Suvidha-Kiosk/client/src/pages/ThankYou.tsx` - Thank you screen after logout
- `Suvidha-Kiosk/client/src/components/VoiceAgent.tsx` - Voice AI agent with mic recording, audio playback, text chat
- `Suvidha-Kiosk/client/public/audio-playback-worklet.js` - AudioWorklet processor for PCM16 audio streaming
- `Suvidha-Kiosk/server/replit_integrations/audio/routes.ts` - Express routes for voice and text chat API
- `Suvidha-Kiosk/server/replit_integrations/audio/client.ts` - OpenAI API client for audio/text processing
- `Suvidha-Kiosk/server/replit_integrations/chat/storage.ts` - PostgreSQL conversation/message storage
- `Suvidha-Kiosk/shared/models/chat.ts` - Drizzle schema for conversations and messages tables
- `Suvidha-Kiosk/db/index.ts` - Database connection pool

### Routes
- `/` - Home (4 options: Sign Up, Face Login, Mobile Login, Scan QR)
- `/signup` - Aadhaar registration with face scan
- `/login/face` - Face scan login
- `/login/mobile` - Mobile OTP login
- `/login/qr` - QR code login
- `/dashboard` - Personalized unified dashboard
- `/dashboard/requests` - My Requests status tracker
- `/dashboard/documents` - Documents & receipts
- `/dashboard/notifications` - Notifications & alerts
- `/dashboard/profile` - Profile & preferences
- `/service/:type` - Service request flow (electricity, gas, water, waste, infrastructure, municipal, complaints)
- `/thank-you` - Thank you screen after logout (auto-redirects to home)

## Dashboard Features
- **Welcome Banner**: "Welcome, Citizen" (privacy-first), language indicator, accessibility mode badges, session security status
- **Service Tiles**: Electricity (with quick actions), Gas (with emergency tag), Municipal Services (mega-tile with Water/Waste/Infrastructure)
- **Bottom Quick Access**: Complaint Center, My Requests, Documents, Notifications (with badge count), Profile
- **Voice AI Agent**: Floating button available on ALL pages (home to end) with voice (microphone) and text chat interface powered by OpenAI gpt-4o-audio
- **Alerts**: Emergency/high-priority alerts displayed prominently

## Accessibility Features
- **Screen Reader Mode**: Toggle in accessibility settings announces all button clicks via speech synthesis
- **Global Click-to-Speak**: When screen reader mode is on, every button/link click announces its name aloud
- **Page Voice Guidance**: Automatic voice descriptions when navigating to any page (guides visually impaired users through available options)
- **Multi-language Voice**: Page guidance and button announcements use correct speech language (English, Hindi, etc.)
- **High Contrast Mode**: Enhanced borders and colors for low-vision users
- **Font Size Control**: Normal, Large, Extra-Large text options
- **Skip Navigation**: Hidden skip link for keyboard users
- **Back button**: Hidden on dashboard/logged-in pages to prevent accidental navigation

## Session Management
- Username and logout shown in header when logged in (dashboard/service pages only)
- Home button hidden when logged in (no accidental navigation away)
- Logout clears all session data, shows Thank You screen for 4 seconds, then redirects to home
- Auto-logout after inactivity (planned)

## User Preferences
- Language and accessibility settings (font size, high contrast) are saved to localStorage
- When a user registers their face during signup, their current settings are saved alongside
- On face login, the user's saved settings are automatically restored
- Settings persist across sessions via localStorage

## Translation System
- Uses `t(key, language)` function from `translations.ts`
- 6 languages: English, Hindi, Chhattisgarhi, Marathi, Telugu, Tamil
- 130+ translation keys covering all pages
- Language selection in header updates all text in real-time

## Print Layouts
- Suvidha Pass card: Proper ID card format with header, citizen ID, QR code, name, Aadhaar, face ID status, issue date
- Complaint receipt: Formatted receipt with complaint ID, service type, category, description, urgency, date/time
- Uses hidden `print-area` div with `@media print` CSS for clean print output
