#!/usr/bin/env bash
# =============================================================================
#  AstraNodes — Production Update Script
#  Run after `git pull` to apply code changes without losing your database.
#
#  Usage:  bash update.sh
#  What it does:
#    1. Pulls latest code from git
#    2. Installs/updates backend dependencies
#    3. Runs ALL database migrations (safe — idempotent)
#    4. Rebuilds the React frontend
#    5. Copies frontend to Nginx web root
#    6. Gracefully restarts the API via PM2
#
#  Your database, .env files, and uploads are NEVER touched.
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'
info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
err()     { echo -e "${RED}[ERROR]${RESET} $*" >&2; exit 1; }
header()  { echo -e "\n${BOLD}${CYAN}══ $* ══${RESET}"; }

# ── Resolve install directory ────────────────────────────────────────────────
# If this script lives inside the app directory, use that.
# Otherwise fall back to saved deploy config → default /opt/astranodes.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_FILE="${HOME}/.astranodes-deploy.conf"

if [[ -f "$CONFIG_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$CONFIG_FILE"
  APP_DIR="${APP_DIR:-/opt/astranodes}"
elif [[ -f "${SCRIPT_DIR}/backend/package.json" ]]; then
  APP_DIR="$SCRIPT_DIR"
else
  APP_DIR="/opt/astranodes"
fi

info "Install directory: ${APP_DIR}"

[[ -d "$APP_DIR" ]] || err "App directory not found: ${APP_DIR}. Run deploy.sh first."
[[ -f "${APP_DIR}/backend/package.json" ]] || err "Backend not found at ${APP_DIR}/backend. Run deploy.sh first."

# ── Git pull ────────────────────────────────────────────────────────────────
header "Pulling latest code"

if [[ -d "${APP_DIR}/.git" ]]; then
  git -C "$APP_DIR" fetch --all
  git -C "$APP_DIR" pull --ff-only
  success "Code updated"
else
  warn "No .git directory found — skipping git pull. Copy new code manually if needed."
fi

# ── Backend dependencies ─────────────────────────────────────────────────────
header "Updating backend dependencies"
npm --prefix "${APP_DIR}/backend" install --omit=dev --quiet
success "Backend dependencies updated"

# ── Database migrations ───────────────────────────────────────────────────────
header "Running database migrations"
info "Migrations are idempotent — safe to run on existing data."

MIGRATE_SCRIPTS=(
  migrate
  migrate-icons
  migrate-duration
  migrate-tickets
  upgrade-tickets
  migrate-frontpage
  migrate-oauth
)

for script in "${MIGRATE_SCRIPTS[@]}"; do
  if npm --prefix "${APP_DIR}/backend" run --if-present "$script" 2>&1; then
    success "${script} OK"
  else
    warn "${script} reported errors (may be safe — already applied)"
  fi
done

# ── Frontend build ────────────────────────────────────────────────────────────
header "Building React frontend"
npm --prefix "${APP_DIR}/frontend" install --quiet
npm --prefix "${APP_DIR}/frontend" run build
success "Frontend built"

# ── Copy frontend to web root ─────────────────────────────────────────────────
WEB_ROOT="/var/www/astranodes"
if [[ -d "$WEB_ROOT" ]]; then
  rsync -a --delete "${APP_DIR}/frontend/dist/" "${WEB_ROOT}/"
  success "Frontend copied to ${WEB_ROOT}"
else
  warn "Web root ${WEB_ROOT} not found — skipping copy. Run deploy.sh to set up Nginx."
fi

# ── Restart API ───────────────────────────────────────────────────────────────
header "Restarting API"

if command -v pm2 &>/dev/null; then
  if pm2 list | grep -q "astranodes-api"; then
    pm2 reload astranodes-api
    success "API reloaded via PM2 (zero-downtime)"
  else
    warn "pm2 process 'astranodes-api' not found — starting fresh"
    cd "$APP_DIR"
    pm2 start ecosystem.config.cjs --env production
    pm2 save
  fi
else
  warn "PM2 not installed — restart your API manually."
fi

# ── Reload Nginx ──────────────────────────────────────────────────────────────
if command -v nginx &>/dev/null && systemctl is-active --quiet nginx; then
  nginx -t && systemctl reload nginx
  success "Nginx reloaded"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}═══════════════════════════════${RESET}"
echo -e "${BOLD}${GREEN}  Update complete!${RESET}"
echo -e "${BOLD}${GREEN}═══════════════════════════════${RESET}"
echo ""
echo -e "  ${BOLD}API logs:${RESET}  pm2 logs astranodes-api --lines 50"
echo -e "  ${BOLD}Status:${RESET}    pm2 status"
echo ""
