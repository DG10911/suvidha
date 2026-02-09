# Suvidha Kiosk

## Overview
Suvidha Kiosk is a digital citizen services kiosk application built with React (Vite) frontend and Express backend. It provides civic services including face-based login, mobile login, QR code scanning, and citizen registration via Aadhaar.

## Recent Changes (Feb 2026)
- Implemented 6-layer liveness detection for face scanning (texture analysis, eye/retina scan, blink detection, motion analysis, identity consistency)
- Added duplicate face prevention on server side (0.45 threshold) during signup
- Fixed AI voice assistant: queue-based speech system prevents voice clashes, proper delays on button clicks and language changes
- Updated FaceLogin.tsx and Signup.tsx with real-time liveness check UI
- Updated KioskLayout.tsx with improved language change voice handling

## Project Architecture
- **Frontend**: React + Vite (TypeScript), served on port 5000
- **Backend**: Express.js (TypeScript), same port 5000
- **Database**: PostgreSQL (Neon-backed via Replit)
- **Face Detection**: face-api.js (client-side)
- **TTS**: OpenAI API (server-side)
- **ORM**: Drizzle

## Key Files
- `client/src/lib/faceUtils.ts` - Face detection, liveness verification, anti-spoof checks
- `client/src/lib/speechHelper.ts` - Queue-based TTS with delay management
- `client/src/pages/FaceLogin.tsx` - Face login with liveness UI
- `client/src/pages/Signup.tsx` - Citizen registration with face capture
- `client/src/components/layout/KioskLayout.tsx` - Main layout with language/voice handling
- `server/routes.ts` - API routes including duplicate face check
- `server/replit_integrations/audio/client.ts` - OpenAI TTS client

## Running
- Workflow: `cd Suvidha-Kioskzip/Suvidha-Kiosk && npm run dev`
- The app runs on port 5000

## Environment
- `OPENAI_API_KEY` - For text-to-speech
- `DATABASE_URL` - PostgreSQL connection
- `SESSION_SECRET` - Session management

## Design Decisions
- Face matching threshold: 0.6 (login), Duplicate detection: 0.45 (stricter)
- Multi-frame liveness: 8 frames with 350ms delays
- Speech queue: 150ms pre-speak delay, 200ms inter-queue delay, 800ms language change delay
