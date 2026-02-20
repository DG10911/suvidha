#!/usr/bin/env bash
# ============================================================
# Suvidha Kiosk — Local Setup Script
# Run once after cloning: bash setup.sh
# ============================================================
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC}   $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERR]${NC}  $*"; exit 1; }

echo ""
echo "==========================================="
echo "  Suvidha Kiosk — Setup"
echo "==========================================="
echo ""

# ---- 1. Node.js check ----
NODE_VER=$(node --version 2>/dev/null | sed 's/v//')
MAJOR=$(echo "$NODE_VER" | cut -d. -f1)
if [ -z "$NODE_VER" ]; then
  error "Node.js not found. Install Node.js 20+ from https://nodejs.org"
fi
if [ "$MAJOR" -lt 20 ]; then
  error "Node.js $NODE_VER found, but 20+ is required. Please upgrade."
fi
success "Node.js v$NODE_VER"

# ---- 2. Install dependencies ----
info "Installing npm dependencies…"
npm install --silent
success "Dependencies installed"

# ---- 3. Create .env ----
if [ ! -f .env ]; then
  cp ../../.env.example .env 2>/dev/null || cp .env.example .env 2>/dev/null || true
  if [ ! -f .env ]; then
    cat > .env <<'ENVEOF'
DATABASE_URL=postgresql://suvidha:suvidha@localhost:5432/suvidha
SESSION_SECRET=dev-secret-change-in-production
OPENAI_API_KEY=sk-replace-with-real-key
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=replace-with-real-token
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
PORT=5000
ENVEOF
  fi
  warn ".env created from template — EDIT IT before starting the server"
  echo ""
  echo "  Required:"
  echo "    DATABASE_URL   → your PostgreSQL connection string"
  echo "    OPENAI_API_KEY → from https://platform.openai.com/api-keys"
  echo ""
  echo "  Optional (for SMS/OTP login):"
  echo "    TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER"
  echo ""
else
  success ".env already exists"
fi

# ---- 4. Database check ----
echo ""
info "Checking DATABASE_URL in .env…"
# Extract DATABASE_URL safely without sourcing the whole .env file
DB_URL=$(grep '^DATABASE_URL=' .env 2>/dev/null | cut -d= -f2-)
if [ -z "$DB_URL" ] || echo "$DB_URL" | grep -q "postgresql://user:password"; then
  warn "DATABASE_URL not configured yet."
  echo ""
  echo "  Option A — Use Docker (easiest, no account needed):"
  echo "    docker compose up -d"
  echo "    Then set in .env:"
  echo "      DATABASE_URL=postgresql://suvidha:suvidha@localhost:5432/suvidha"
  echo ""
  echo "  Option B — Use Neon free cloud DB (no install):"
  echo "    1. Go to https://neon.tech and sign up for free"
  echo "    2. Create a project, copy the connection string"
  echo "    3. Paste it as DATABASE_URL in .env"
  echo ""
  echo "  After setting DATABASE_URL, run:  npm run db:push"
else
  success "DATABASE_URL configured"
  info "Pushing schema to database…"
  # Export only DATABASE_URL for the db:push command
  if DATABASE_URL="$DB_URL" npm run db:push 2>&1; then
    success "Database schema ready"
  else
    warn "db:push failed — check your DATABASE_URL and that the DB is reachable"
  fi
fi

echo ""
echo "==========================================="
echo "  Setup complete!"
echo ""
echo "  Start dev server:    npm run dev"
echo "  Open in browser:     http://localhost:5000"
echo ""
echo "  Test with any 12-digit Aadhaar e.g.:  123456789012"
echo "  (no real Aadhaar needed — data is generated)"
echo "==========================================="
echo ""
