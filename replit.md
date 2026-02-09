# Suvidha Kiosk

## Overview
Suvidha Kiosk is a digital citizen services kiosk application built with React (Vite) frontend and Express backend. It provides civic services including face-based login, mobile login, QR code scanning, and citizen registration via Aadhaar.

## Recent Changes (Feb 2026)
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

## Key Files
- `client/src/lib/faceUtils.ts` - Face detection, 5-step liveness verification, anti-spoof checks
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
- Event-driven liveness: each step waits for actual detection before proceeding (not timer-based)
- Steps: face detect (5 frames) → texture → screen check → eyes → identity (no blink/motion needed)
- Face detection: retry with 3 configs (512/416/320) for robust detection across lighting/distances
- Signup: existing Aadhaar users without face data get updated (not blocked); new users get full registration
- Screen detection: composite score from moire, reflection, blue ratio, saturation, color variance, brightness (threshold: 4+ indicators)
- Scanning overlay: dimmed background, glowing corners, scan line with trail, grid pattern, rotating rays, floating particles, HUD data readout
- Identity consistency: 0.55 distance threshold, 55% pair consistency, requires ≥3 frames
- Speech queue: 150ms pre-speak delay, 200ms inter-queue delay, 800ms language change delay

## User Preferences
- Strong anti-spoof: must block photos shown on phone screens
- No duplicate face registration allowed
- 100 sample users seeded with Aadhaar but no face data
