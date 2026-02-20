#!/usr/bin/env bash
# This script redirects to the correct setup location.
# The actual app is in Suvidha-Kioskzip/Suvidha-Kiosk/

echo ""
echo "==> Suvidha Kiosk setup"
echo ""

if [ ! -d "Suvidha-Kioskzip/Suvidha-Kiosk" ]; then
  echo "ERROR: Run this from the repository root (suvidha/ directory)"
  exit 1
fi

cd Suvidha-Kioskzip/Suvidha-Kiosk
exec bash setup.sh "$@"
