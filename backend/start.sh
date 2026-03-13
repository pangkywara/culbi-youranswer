#!/usr/bin/env bash
# start.sh
# Run the Gemini backend using the local virtual environment.
# Usage: ./backend/start.sh          (from project root)
#        ./start.sh                   (from inside backend/)

set -e

# Resolve the directory this script lives in (always backend/)
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$DIR"

if [[ ! -f "venv/bin/uvicorn" ]]; then
  echo "❌  venv not found. Run this first:"
  echo "    cd backend && python -m venv venv && venv/bin/pip install -r requirements.txt"
  exit 1
fi

echo "🚀  Starting Gemini backend at http://localhost:8000 ..."
exec venv/bin/uvicorn main:app --reload --port 8000
