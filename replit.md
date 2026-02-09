# Suvidha Kiosk

## Overview
Suvidha Kiosk is a digital citizen services kiosk application built with React (Vite) frontend and Express backend. It provides civic services including face-based login, mobile login, QR code scanning, and citizen registration via Aadhaar.

## Recent Changes (Feb 2026)
- Overhauled liveness detection to 8-layer security with challenge-response verification
- Screen/photo detection: moire patterns, color histogram, blue ratio, saturation, brightness uniformity, reflection analysis
- Head movement: phase-aware yaw tracking (straight->right->left) with directional verification
- Blink detection: EAR transition tracking (open->closed transitions)
- All checks now use face-region-only analysis for better accuracy
- Added real-time instructions during scan ("turn right", "turn left", "blink")
- Captured frame thumbnails shown during verification
- Critical checks (face, texture, screen, eyes, head movement, identity) ALL must pass
- Soft checks (blink, motion) at least 1 must pass
- Duplicate face prevention on server side (0.45 threshold)
- Twilio integration connected for OTP/SMS

## Project Architecture
- **Frontend**: React + Vite (TypeScript), served on port 5000
- **Backend**: Express.js (TypeScript), same port 5000
- **Database**: PostgreSQL (Neon-backed via Replit)
- **Face Detection**: face-api.js (client-side)
- **TTS**: OpenAI API (server-side)
- **SMS/OTP**: Twilio (via Replit connector)
- **ORM**: Drizzle

## Key Files
- `client/src/lib/faceUtils.ts` - Face detection, 8-layer liveness verification, anti-spoof checks
- `client/src/lib/speechHelper.ts` - Queue-based TTS with delay management
- `client/src/pages/FaceLogin.tsx` - Face login with liveness UI and instructions
- `client/src/pages/Signup.tsx` - Citizen registration with face capture and liveness
- `client/src/components/layout/KioskLayout.tsx` - Main layout with language/voice handling
- `server/routes.ts` - API routes including duplicate face check
- `server/twilio.ts` - Twilio SMS/OTP integration
- `server/replit_integrations/audio/client.ts` - OpenAI TTS client

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
- Multi-frame liveness: 12 frames with 400ms delays, 4 phases (straight/right/left/blink)
- Screen detection: composite score from moire, reflection, blue ratio, saturation, color variance, brightness, face size variance (threshold: 4+ indicators)
- Head movement: phase-aware yaw comparison (requires opposing direction turns)
- Speech queue: 150ms pre-speak delay, 200ms inter-queue delay, 800ms language change delay

## User Preferences
- Strong anti-spoof: must block photos shown on phone screens
- No duplicate face registration allowed
- 100 sample users seeded with Aadhaar but no face data
