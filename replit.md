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
  - **Enhanced Dashboard**: 14 colored feature tiles (Appointments, Announcements, Emergency SOS, Feedback, Govt Schemes, Certificates, RTI, Nearby Services, Property Tax, Blood Banks, Grievance Portal, Pension Tracker, DigiLocker, Water Bill) added between main services and bottom tiles
  - **Certificate Applications**: Apply for 8 govt certificates (Birth, Income, Caste, Domicile, Marriage, Death, Residence, Character) with fee calculation, tracking, document generation
  - **RTI Filing**: Digital Right to Information applications to 12 departments with BPL exemption, 30-day response tracking
  - **Nearby Services**: Directory of 19+ locations in Raipur (hospitals, police stations, banks, post offices, schools, gas agencies, ration shops) with contact info, hours, addresses
  - **Property Tax Calculator**: Estimate annual property tax based on property type, zone, area, floor, age with breakdown and early payment discount
  - **Blood Bank Finder**: 6 real blood banks in Raipur with live blood group availability (A+/A-/B+/B-/O+/O-/AB+/AB-), stock levels, auto GPS location, distance sorting, Google Maps directions
  - **Public Grievance Portal**: File grievances against 12 government departments with priority levels, officer assignment, expected resolution timeline, tracking by Grievance ID
  - **Pension Tracker**: Check pension status, view payment history, apply for 5 pension schemes (Old Age, Widow, Disability, Atal, CG Social), bank account linking
  - **DigiLocker**: Secure digital document vault for 14 document types (Aadhaar, PAN, Voter ID, DL, Ration Card, certificates, marksheets, land records), add/delete/search, verification status
  - **Water Bill & Payment**: Enter connection ID to view 6-month billing history, pay unpaid bills via wallet, consumption trend chart, slab-based bill calculator
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
- **certificateApplications** - 8 types of certificate applications (birth, death, income, caste, domicile, marriage, residence, character) with tracking
- **rtiApplications** - Right to Information applications to 12 departments with BPL exemption
- **grievances** - Public grievance filings with department, priority, officer assignment, resolution tracking
- **pensionRecords** - Pension scheme registrations with monthly amount, status, payment dates
- **pensionPayments** - Individual pension payment records with transaction IDs
- **digiLocker** - Digital document storage with 14 types, verification status, issuer info
- **waterBills** - Water billing records with connection ID, consumption, payment status

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
- `client/src/pages/CertificateApplication.tsx` - Apply for 8 govt certificates with tracking
- `client/src/pages/RTIApplication.tsx` - File RTI applications with department selection
- `client/src/pages/NearbyServices.tsx` - Directory of 19+ public facilities in Raipur
- `client/src/pages/PropertyTaxCalc.tsx` - Property tax estimation calculator
- `client/src/pages/BloodBankFinder.tsx` - Blood bank finder with GPS location and availability
- `client/src/pages/GrievancePortal.tsx` - Public grievance filing and tracking
- `client/src/pages/PensionTracker.tsx` - Pension status check and application
- `client/src/pages/DigiLockerPage.tsx` - Digital document vault
- `client/src/pages/WaterBillPage.tsx` - Water billing, payment, and calculator
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
- `/api/certificates/types` - List 8 certificate types with fees and processing time
- `/api/certificates/apply` - POST submit certificate application
- `/api/certificates/my` - GET user's certificate applications
- `/api/certificates/track/:applicationId` - Track application by ID
- `/api/rti/departments` - List 12 government departments for RTI
- `/api/rti/apply` - POST file RTI application
- `/api/rti/my` - GET user's RTI applications
- `/api/rti/track/:rtiId` - Track RTI by ID
- `/api/nearby-services` - GET directory of 19+ public facilities with category/search filter
- `/api/tax/calculate` - POST calculate property tax by zone, type, area, age
- `/api/blood-banks` - GET blood banks with blood group availability, filter by group
- `/api/grievances/departments` - GET 12 departments for grievance filing
- `/api/grievances/file` - POST file a public grievance
- `/api/grievances/my` - GET user's grievances
- `/api/grievances/track/:grievanceId` - Track grievance by ID
- `/api/pension/schemes` - GET 5 pension schemes with eligibility
- `/api/pension/check` - GET pension records by userId or Aadhaar
- `/api/pension/register` - POST apply for pension scheme
- `/api/digilocker/types` - GET 14 document types
- `/api/digilocker/my` - GET user's stored documents
- `/api/digilocker/add` - POST add document to locker
- `/api/digilocker/:id` - DELETE remove document
- `/api/water/bills` - GET water bills by userId or connectionId
- `/api/water/generate-bill` - POST generate 6-month billing history
- `/api/water/pay` - POST pay water bill from wallet
- `/api/water/calculate` - POST calculate water bill by units

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
