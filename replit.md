# Suvidha Kiosk

## Overview
Suvidha Kiosk is a digital citizen services kiosk application built with React (Vite) frontend and Express backend. It provides civic services including face-based login, mobile login, QR code scanning, and citizen registration via Aadhaar.

## Recent Changes (Feb 2026)
- **New Features Added**:
  - **Appointment Booking**: Multi-step wizard to book visits at 6 government offices with slot availability, token generation, confirmation receipts, cancel support
  - **Announcements Board**: Government announcements with category filtering (water, electricity, gas, health, scheme, tax, infrastructure), 8 auto-seeded announcements
  - **Emergency SOS**: 6 emergency services (Police 100, Ambulance 108, Fire 101, Gas 1906, Electricity 1912, Water helpline) with alert logging and history
  - **Feedback System**: Star ratings (1-5) for 7 service categories, aggregated ratings summary, personal feedback history
  - **Govt Schemes**: 10 real government schemes (PM Awas Yojana, Ayushman Bharat, PM Kisan, Ujjwala, Sukanya Samriddhi, PM Vishwakarma, Atal Pension, PM Surya Ghar, Mahtari Vandana, Stand Up India) with eligibility, benefits, step-by-step application guide, and required documents
  - **Enhanced Dashboard**: 5 new colored feature tiles (Appointments, Announcements, Emergency SOS, Feedback, Govt Schemes) added between main services and bottom tiles
- **Backend Integration**: All service pages now connected to real APIs
  - ElectricityService, GasService, MunicipalService form submissions → POST /api/complaints
  - ServiceRequest form → POST /api/complaints with real complaint IDs
  - PaymentFlow → GET /api/wallet/:userId (real balance) + POST /api/wallet/:userId/pay (wallet payments)
  - Service pages auto-fetch linked consumer IDs from /api/linked-services/:userId
  - Fixed userId propagation: kioskStore/ComplaintCenter now use localStorage prefs (was broken sessionStorage)
- Liveness pipeline simplified to 5 core anti-spoof steps only (no blink/motion required)
- Steps: face detection (5 frames) → texture analysis → screen/photo detection → eye openness → identity consistency
- Blink detection and motion detection fully removed from codebase
- Screen/photo detection: moire patterns, color histogram, blue ratio, saturation, brightness uniformity, reflection analysis
- All checks now use face-region-only analysis for better accuracy
- Added guided step-by-step instructions during scan
- Impressive scanning overlay: glowing rays, laser scan line with trail, grid pattern, floating particles, data readout HUD
- Captured frame thumbnails shown during verification
- Signup now allows existing Aadhaar users (seeded) to add face data instead of blocking them
- Duplicate face prevention on server side (0.45 threshold) — runs before any registration
- Twilio integration connected for OTP/SMS

## Project Architecture
- **Frontend**: React + Vite (TypeScript), served on port 5000
- **Backend**: Express.js (TypeScript), same port 5000
- **Database**: PostgreSQL (Neon-backed via Replit)
- **Face Detection**: face-api.js (client-side) for detection, descriptors, and anti-spoof checks
- **TTS**: OpenAI API (server-side)
- **SMS/OTP**: Twilio (via Replit connector)
- **ORM**: Drizzle

## Database Tables
- users, faceProfiles, qrTokens, complaints, complaintTimeline, documents, notifications, linkedServices, walletAccounts, walletTransactions
- **appointments** - Office visit bookings with slots, tokens, status
- **feedback** - Service ratings (1-5) with optional comments
- **announcements** - Government notices with categories, priority, date filtering
- **emergencyLogs** - Emergency service alert records
- **govtSchemes** - Government schemes with eligibility, benefits, apply steps, documents

## Key Files
- `client/src/lib/faceUtils.ts` - Face detection, 5-step liveness verification, anti-spoof checks
- `client/src/lib/speechHelper.ts` - Queue-based TTS with delay management
- `client/src/pages/FaceLogin.tsx` - Face login with liveness UI and instructions
- `client/src/pages/Signup.tsx` - Citizen registration with face capture and liveness
- `client/src/pages/AppointmentBooking.tsx` - Multi-step appointment booking wizard
- `client/src/pages/Announcements.tsx` - Government announcements with filters
- `client/src/pages/EmergencySOS.tsx` - Emergency services quick access
- `client/src/pages/FeedbackPage.tsx` - Service rating and feedback
- `client/src/pages/GovtSchemes.tsx` - Government schemes with apply steps
- `client/src/pages/Dashboard.tsx` - Main dashboard with all service tiles
- `client/src/components/layout/KioskLayout.tsx` - Main layout with language/voice handling
- `server/routes.ts` - API routes including all CRUD endpoints
- `server/twilio.ts` - Twilio SMS/OTP integration
- `server/replit_integrations/audio/client.ts` - OpenAI TTS client

## API Routes
- `/api/offices` - List government offices
- `/api/appointments` - GET (list), POST (book), PATCH /:id/cancel
- `/api/appointments/slots` - Available slots for office+date
- `/api/feedback` - GET (list), POST (submit)
- `/api/feedback/summary` - Aggregated ratings per service
- `/api/announcements` - Active announcements with date filtering
- `/api/emergency` - POST (log alert)
- `/api/emergency/history` - User emergency history
- `/api/schemes` - GET (list all active schemes, filter by category)
- `/api/schemes/:id` - GET (single scheme details)
- `/api/dashboard/stats/:userId` - Unified dashboard statistics

## Running
- Workflow: `cd Suvidha-Kioskzip/Suvidha-Kiosk && npm run dev`
- The app runs on port 5000

## Environment
- `OPENAI_API_KEY` - For text-to-speech
- `DATABASE_URL` - PostgreSQL connection
- `SESSION_SECRET` - Session management
- Twilio credentials via Replit connector

## Design Decisions
- Face matching threshold: 0.6 (login), Duplicate detection: 0.45 (stricter)
- Event-driven liveness: each step waits for actual detection before proceeding (not timer-based)
- Steps: face detect (5 frames) → texture → screen check → eyes → identity (no blink/motion needed)
- Face detection: retry with 3 configs (512/416/320) for robust detection across lighting/distances
- Signup: existing Aadhaar users without face data get updated (not blocked); new users get full registration
- Screen detection: composite score from moire, reflection, blue ratio, saturation, color variance, brightness (threshold: 4+ indicators)
- Scanning overlay: dimmed background, glowing corners, scan line with trail, grid pattern, rotating rays, floating particles, HUD data readout
- Identity consistency: 0.55 distance threshold, 55% pair consistency, requires ≥3 frames
- Speech queue: 150ms pre-speak delay, 200ms inter-queue delay, 800ms language change delay
- Appointment slots: 30-min intervals, max 30 days advance booking, token generated on confirmation
- Announcements: startDate/endDate filtering, category-based organization
- Emergency: 6 services mapped to real Indian helpline numbers

## User Preferences
- Strong anti-spoof: must block photos shown on phone screens
- No duplicate face registration allowed
- 100 sample users seeded with Aadhaar but no face data
