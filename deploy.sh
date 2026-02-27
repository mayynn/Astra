#!/usr/bin/env bash
# =============================================================================
#  AstraNodes — Interactive VPS Deployment Script
#  Supports: Ubuntu 22.04 / 24.04
#  Usage: bash deploy.sh
# =============================================================================
set -euo pipefail

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'
info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; exit 1; }
header()  { echo -e "\n${BOLD}${CYAN}══ $* ══${RESET}"; }

ask() {
  # ask <VAR_NAME> <prompt> [default]
  local var="$1" prompt="$2" default="${3:-}"
  local hint=""
  [[ -n "$default" ]] && hint=" [${default}]"
  while true; do
    read -rp "$(echo -e "${YELLOW}?${RESET} ${prompt}${hint}: ")" value
    value="${value:-$default}"
    # Trim leading/trailing whitespace
    value="$(echo -e "${value}" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
    if [[ -n "$value" ]]; then
      printf -v "$var" '%s' "$value"
      return
    fi
    echo -e "${RED}  This field is required.${RESET}"
  done
}

ask_optional() {
  # ask_optional <VAR_NAME> <prompt> [default]
  local var="$1" prompt="$2" default="${3:-}"
  local hint=""
  [[ -n "$default" ]] && hint=" [${default}]"
  read -rp "$(echo -e "${YELLOW}?${RESET} ${prompt}${hint}: ")" value
  value="${value:-$default}"
  # Trim leading/trailing whitespace
  value="$(echo -e "${value}" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
  printf -v "$var" '%s' "$value"
}

ask_yn() {
  # ask_yn <VAR_NAME> <prompt> <default: y|n>
  local var="$1" prompt="$2" default="${3:-y}"
  local choices; [[ "$default" == "y" ]] && choices="Y/n" || choices="y/N"
  read -rp "$(echo -e "${YELLOW}?${RESET} ${prompt} [${choices}]: ")" value
  value="${value:-$default}"
  [[ "${value,,}" == "y" ]] && printf -v "$var" 'yes' || printf -v "$var" 'no'
}

# ─────────────────────────────────────────────────────────────────────────────
#  BANNER
# ─────────────────────────────────────────────────────────────────────────────
clear
echo -e "${BOLD}${CYAN}"
echo "  ╔═══════════════════════════════════════════╗"
echo "  ║       AstraNodes — Deploy Script          ║"
echo "  ║   Ubuntu 22.04/24.04 · Node · Nginx · PM2 ║"
echo "  ╚═══════════════════════════════════════════╝"
echo -e "${RESET}"
echo "  This script will:"
echo "   1. Install Node.js LTS, Nginx, PM2, Certbot"
echo "   2. Create backend + frontend config files"
echo "   3. Build the React frontend"
echo "   4. Run database migrations"
echo "   5. Configure Nginx with HTTPS (Let's Encrypt)"
echo "   6. Start the API with PM2 (auto-restart on reboot)"
echo ""
warn "Run as root or with sudo. Press Ctrl-C to abort."
echo ""

# ─────────────────────────────────────────────────────────────────────────────
#  SAVED CONFIG — skip questions on re-run
# ─────────────────────────────────────────────────────────────────────────────
CONFIG_FILE="${HOME}/.astranodes-deploy.conf"

# List of every variable the interactive wizard collects.
CONFIG_VARS=(
  DOMAIN SSL_EMAIL APP_DIR APP_PORT
  JWT_SECRET JWT_EXPIRES
  DB_PATH UPLOAD_DIR
  PTERO_URL PTERO_KEY PTERO_EGG PTERO_IMAGE PTERO_STARTUP PTERO_ENV
  DISCORD_WEBHOOK DISCORD_SUPPORT_WEBHOOK
  UPI_ID_VAL UPI_NAME_VAL
  ADSTERRA_TOKEN ADSTERRA_DOMAIN_ID_VAL ADSTERRA_NATIVE_ID ADSTERRA_BANNER_ID_VAL
  ADSTERRA_NATIVE_KEY ADSTERRA_BANNER_KEY ADSTERRA_NATIVE_SCRIPT
  ADSTERRA_BANNER_SCRIPT ADSTERRA_NATIVE_CONT
)

save_config() {
  # Persist all wizard answers so re-runs can skip the questionnaire.
  {
    echo "# AstraNodes deploy config — auto-generated $(date -Iseconds)"
    for v in "${CONFIG_VARS[@]}"; do
      # Use printf %q to safely quote values (spaces, special chars, etc.)
      printf '%s=%q\n' "$v" "${!v:-}"
    done
  } > "$CONFIG_FILE"
  chmod 600 "$CONFIG_FILE"
}

load_config() {
  # Source the saved file; all CONFIG_VARS become available.
  # shellcheck disable=SC1090
  source "$CONFIG_FILE"
}

SKIPPED_WIZARD=false

if [[ -f "$CONFIG_FILE" ]]; then
  echo -e "  ${GREEN}Found saved config from a previous run.${RESET}"
  echo -e "  ${CYAN}${CONFIG_FILE}${RESET}"
  echo ""
  ask_yn USE_SAVED "Re-use saved settings? (skip all questions)" "y"
  if [[ "$USE_SAVED" == "yes" ]]; then
    load_config
    SKIPPED_WIZARD=true
    success "Loaded saved config — jumping to review."
  fi
fi

if [[ "$SKIPPED_WIZARD" != "true" ]]; then

# ─────────────────────────────────────────────────────────────────────────────
#  SECTION 1 — General
# ─────────────────────────────────────────────────────────────────────────────
header "1 / 8  General Settings"

ask DOMAIN    "Domain name (e.g. astranodes.cloud)"
ask SSL_EMAIL "Email for Let's Encrypt SSL cert"
ask APP_DIR   "Install directory on this server" "/opt/astranodes"
ask APP_PORT  "Backend API port (internal, not public)" "4000"

# ─────────────────────────────────────────────────────────────────────────────
#  SECTION 2 — Secrets & Auth
# ─────────────────────────────────────────────────────────────────────────────
header "2 / 8  Secrets & Auth"

GEN_SECRET=$(openssl rand -hex 32 2>/dev/null || tr -dc 'a-zA-Z0-9' </dev/urandom | head -c 64)
echo -e "  ${CYAN}Auto-generated JWT secret (press Enter to use it):${RESET}"
echo -e "  ${GEN_SECRET}"
ask JWT_SECRET  "JWT secret (min 32 chars, Enter = use generated)" "$GEN_SECRET"
ask JWT_EXPIRES "JWT expiry"  "7d"

if [[ ${#JWT_SECRET} -lt 32 ]]; then
  error "JWT_SECRET must be at least 32 characters."
fi

# ─────────────────────────────────────────────────────────────────────────────
#  SECTION 3 — Database & Storage
# ─────────────────────────────────────────────────────────────────────────────
header "3 / 8  Database & Storage"

ask DB_PATH     "SQLite database path" "${APP_DIR}/backend/data/astranodes.sqlite"
ask UPLOAD_DIR  "Uploads directory"    "${APP_DIR}/backend/uploads"

# ─────────────────────────────────────────────────────────────────────────────
#  SECTION 4 — Pterodactyl
# ─────────────────────────────────────────────────────────────────────────────
header "4 / 8  Pterodactyl Panel"

ask     PTERO_URL    "Pterodactyl panel URL (e.g. https://panel.example.com)"
ask     PTERO_KEY    "Pterodactyl admin API key"

echo ""
echo -e "  ${CYAN}Node selection is automatic.${RESET}"
echo -e "  At provision time the system queries all your panel nodes,"
echo -e "  checks real-time memory/disk availability, and picks the best one."
echo -e "  You do NOT need to set a default node ID."
echo ""

ask     PTERO_EGG     "Default egg ID" "1"
ask     PTERO_IMAGE   "Docker image" "ghcr.io/pterodactyl/yolks:java_17"
ask     PTERO_STARTUP "Startup command" 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar server.jar'
echo -e "  ${CYAN}Environment variables for the Pterodactyl egg (JSON):${RESET}"
ask     PTERO_ENV     "Pterodactyl ENV JSON" '{"MINECRAFT_VERSION":"1.20.1","SERVER_JARFILE":"server.jar","BUILD_NUMBER":"latest"}'

# ─────────────────────────────────────────────────────────────────────────────
#  SECTION 5 — Discord
# ─────────────────────────────────────────────────────────────────────────────
header "5 / 8  Discord Webhooks"

ask          DISCORD_WEBHOOK         "Discord webhook URL (UTR notifications)"
ask_optional DISCORD_SUPPORT_WEBHOOK "Discord support channel webhook (optional)" ""

# ─────────────────────────────────────────────────────────────────────────────
#  SECTION 6 — UPI Payment
# ─────────────────────────────────────────────────────────────────────────────
header "6 / 8  UPI Payment Details"
echo "  These are shown on the Billing page so users know where to send money."

ask_optional UPI_ID_VAL   "UPI ID (e.g. yourname@upi)"          ""
ask_optional UPI_NAME_VAL "UPI registered name / business name"  ""

# ─────────────────────────────────────────────────────────────────────────────
#  SECTION 7 — Adsterra Ads
# ─────────────────────────────────────────────────────────────────────────────
header "7 / 8  Adsterra Monetisation"
echo -e "  ${CYAN}Leave all blank to disable ad serving.${RESET}"
echo ""

ask_optional ADSTERRA_TOKEN         "Adsterra API token"             ""
ask_optional ADSTERRA_DOMAIN_ID_VAL "Adsterra domain ID"             ""
ask_optional ADSTERRA_NATIVE_ID     "Native banner placement ID"     ""
ask_optional ADSTERRA_BANNER_ID_VAL "Banner placement ID"             ""
ask_optional ADSTERRA_NATIVE_KEY    "Native banner placement key"    ""
ask_optional ADSTERRA_BANNER_KEY    "Banner placement key"           ""
ask_optional ADSTERRA_NATIVE_SCRIPT "Native banner script URL"       ""
ask_optional ADSTERRA_BANNER_SCRIPT "Banner script URL"              ""
ask_optional ADSTERRA_NATIVE_CONT   "Native banner container ID"     ""

fi  # end SKIPPED_WIZARD

# ─────────────────────────────────────────────────────────────────────────────
#  Review & Confirm
# ────────────────────────────────────────────────────────────────────��────────
header "Review & Confirm"

echo ""
echo -e "  ${BOLD}Domain:${RESET}       https://${DOMAIN}"
echo -e "  ${BOLD}SSL email:${RESET}    ${SSL_EMAIL}"
echo -e "  ${BOLD}Install dir:${RESET}  ${APP_DIR}"
echo -e "  ${BOLD}API port:${RESET}     ${APP_PORT} (internal)"
echo -e "  ${BOLD}DB path:${RESET}      ${DB_PATH}"
echo -e "  ${BOLD}Uploads:${RESET}      ${UPLOAD_DIR}"
echo -e "  ${BOLD}Pterodactyl:${RESET}          ${PTERO_URL}"
echo -e "  ${BOLD}Node selection:${RESET}       automatic (selectBestNode)"
echo -e "  ${BOLD}Egg ID:${RESET}               ${PTERO_EGG}"
echo ""
ask_yn CONFIRM "Proceed with deployment?" "y"
[[ "$CONFIRM" != "yes" ]] && { warn "Aborted."; exit 0; }

# Save config for future re-runs (after user confirmed)
save_config
success "Config saved to ${CONFIG_FILE} — next run can skip all questions."

# =============================================================================
#  INSTALL PHASE
# =============================================================================
header "Installing system packages"

# Wait for any background apt/dpkg process (cloud-init, unattended-upgrades)
# that holds the lock on a freshly provisioned VPS.
wait_apt() {
  local waited=0
  while fuser /var/lib/dpkg/lock-frontend /var/lib/apt/lists/lock /var/cache/apt/archives/lock \
        /var/lib/dpkg/lock &>/dev/null; do
    if [[ $waited -eq 0 ]]; then
      warn "Another process holds the apt lock (cloud-init / unattended-upgrades)."
      info "Waiting up to 3 minutes for it to finish..."
    fi
    sleep 5
    waited=$((waited + 5))
    if [[ $waited -ge 180 ]]; then
      error "apt lock held for >3 minutes. Kill the blocking process and re-run deploy.sh."
    fi
  done
  [[ $waited -gt 0 ]] && success "apt lock released after ${waited}s"
  return 0
}

wait_apt
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y -q curl git nginx certbot python3-certbot-nginx ufw build-essential

# Node.js LTS via NodeSource
if ! command -v node &>/dev/null; then
  info "Installing Node.js v22 LTS..."
  # Download setup script to a temp file instead of piping (curl|bash)
  # because pipefail + set -e kills the deploy if the NodeSource script
  # exits non-zero (common on Ubuntu 22.04 / 24.04).
  curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/nodesource_setup.sh
  bash /tmp/nodesource_setup.sh || warn "NodeSource setup exited non-zero (usually safe — continuing)"
  rm -f /tmp/nodesource_setup.sh
  wait_apt
  apt-get install -y -q nodejs
  command -v node &>/dev/null || error "Node.js installation failed."
  success "Node.js installed: $(node -v)"
else
  success "Node.js already installed: $(node -v)"
fi

# PM2
if ! command -v pm2 &>/dev/null; then
  info "Installing PM2..."
  npm install -g pm2 --quiet
else
  success "PM2 already installed: $(pm2 -v)"
fi

# =============================================================================
#  CLONE / UPDATE REPO
# =============================================================================
header "Preparing application directory"

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

if [[ "$REPO_DIR" == "$APP_DIR" ]]; then
  info "Already in install directory — skipping copy."
else
  if [[ -d "$APP_DIR/.git" ]]; then
    info "Pulling latest changes in ${APP_DIR}..."
    git -C "$APP_DIR" pull --ff-only
  else
    info "Copying files to ${APP_DIR}..."
    mkdir -p "$APP_DIR"
    rsync -a \
      --exclude='.git' \
      --exclude='node_modules' \
      --exclude='backend/data' \
      --exclude='backend/uploads' \
      --exclude='backend/.env' \
      --exclude='frontend/.env' \
      --exclude='frontend/.env.*' \
      --exclude='frontend/dist' \
      --exclude='*.db' \
      --exclude='*.sqlite' \
      --exclude='*.sqlite3' \
      "${REPO_DIR}/" "${APP_DIR}/"
  fi
fi

mkdir -p "$(dirname "$DB_PATH")" "$UPLOAD_DIR"

# =============================================================================
#  WRITE BACKEND .env
# =============================================================================
header "Writing backend/.env"

BACKEND_ENV="${APP_DIR}/backend/.env"

# Build optional-field lines — empty values are omitted so the env file stays clean.
# PTERODACTYL_DEFAULT_NODE is intentionally omitted: node selection is fully automatic.
# selectBestNode() queries the panel API at provision time for real-time availability.
DISCORD_SUPPORT_LINE=""
ADSTERRA_TOKEN_LINE=""
ADSTERRA_DID_LINE=""
ADSTERRA_NID_LINE=""
ADSTERRA_BID_LINE=""

[[ -n "$DISCORD_SUPPORT_WEBHOOK" ]]  && DISCORD_SUPPORT_LINE="DISCORD_SUPPORT_WEBHOOK_URL=${DISCORD_SUPPORT_WEBHOOK}"
[[ -n "$ADSTERRA_TOKEN" ]]           && ADSTERRA_TOKEN_LINE="ADSTERRA_API_TOKEN=${ADSTERRA_TOKEN}"
[[ -n "$ADSTERRA_DOMAIN_ID_VAL" ]]   && ADSTERRA_DID_LINE="ADSTERRA_DOMAIN_ID=${ADSTERRA_DOMAIN_ID_VAL}"
[[ -n "$ADSTERRA_NATIVE_ID" ]]       && ADSTERRA_NID_LINE="ADSTERRA_NATIVE_BANNER_ID=${ADSTERRA_NATIVE_ID}"
[[ -n "$ADSTERRA_BANNER_ID_VAL" ]]   && ADSTERRA_BID_LINE="ADSTERRA_BANNER_ID=${ADSTERRA_BANNER_ID_VAL}"

cat > "$BACKEND_ENV" <<EOF
NODE_ENV=production
PORT=${APP_PORT}
FRONTEND_URL=https://${DOMAIN}

# Auth
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=${JWT_EXPIRES}

# Database & storage
DB_PATH=${DB_PATH}
UPLOAD_DIR=${UPLOAD_DIR}

# Rate limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=200

# Pterodactyl
# PTERODACTYL_DEFAULT_NODE is omitted — nodes are selected automatically
# at provision time by selectBestNode() based on real-time resource checks.
PTERODACTYL_URL=${PTERO_URL}
PTERODACTYL_API_KEY=${PTERO_KEY}
PTERODACTYL_DEFAULT_EGG=${PTERO_EGG}
PTERODACTYL_DEFAULT_DOCKER_IMAGE=${PTERO_IMAGE}
PTERODACTYL_DEFAULT_STARTUP=${PTERO_STARTUP}
PTERODACTYL_DEFAULT_ENV=${PTERO_ENV}

# Discord
DISCORD_WEBHOOK_URL=${DISCORD_WEBHOOK}
${DISCORD_SUPPORT_LINE}

# UPI
UPI_ID=${UPI_ID_VAL}
UPI_NAME=${UPI_NAME_VAL}

# Adsterra
${ADSTERRA_TOKEN_LINE}
${ADSTERRA_DID_LINE}
${ADSTERRA_NID_LINE}
${ADSTERRA_BID_LINE}
ADSTERRA_NATIVE_BANNER_KEY=${ADSTERRA_NATIVE_KEY}
ADSTERRA_BANNER_KEY=${ADSTERRA_BANNER_KEY}
ADSTERRA_NATIVE_BANNER_SCRIPT=${ADSTERRA_NATIVE_SCRIPT}
ADSTERRA_BANNER_SCRIPT=${ADSTERRA_BANNER_SCRIPT}
ADSTERRA_NATIVE_CONTAINER_ID=${ADSTERRA_NATIVE_CONT}
EOF
chmod 600 "$BACKEND_ENV"
success "backend/.env written (chmod 600)"

# =============================================================================
#  WRITE FRONTEND .env.production
# =============================================================================
header "Writing frontend/.env.production"

cat > "${APP_DIR}/frontend/.env.production" <<EOF
VITE_API_URL=https://${DOMAIN}/api
VITE_SOCKET_URL=https://${DOMAIN}
EOF
success "Frontend .env.production written"

# =============================================================================
#  INSTALL DEPENDENCIES
# =============================================================================
header "Installing dependencies"

info "Backend npm install..."
npm --prefix "${APP_DIR}/backend" install --omit=dev --quiet

info "Frontend npm install..."
npm --prefix "${APP_DIR}/frontend" install --quiet

# =============================================================================
#  DATABASE MIGRATIONS
# =============================================================================
header "Running database migrations"

info "A fresh database will be created automatically if one doesn't exist."
info "Location: ${DB_PATH}"
echo ""

# Migration scripts in the order they must be applied.
# --if-present silently skips any script not defined in package.json.
# These migrations are idempotent (safe to run multiple times).
MIGRATE_SCRIPTS=(
  migrate
  migrate-icons
  migrate-duration
  migrate-tickets
  upgrade-tickets
  migrate-frontpage
)

for script in "${MIGRATE_SCRIPTS[@]}"; do
  info "Running migration: ${script}..."
  if npm --prefix "${APP_DIR}/backend" run --if-present "$script"; then
    success "${script} OK"
  else
    warn "${script} reported errors — check output above (may be safe to ignore if already applied)"
  fi
done

# =============================================================================
#  BUILD FRONTEND
# =============================================================================
header "Building React frontend"

npm --prefix "${APP_DIR}/frontend" run build
FRONTEND_DIST="${APP_DIR}/frontend/dist"
success "Frontend built → ${FRONTEND_DIST}"

# Web root for Nginx
WEB_ROOT="/var/www/astranodes"
mkdir -p "$WEB_ROOT"
rsync -a --delete "${FRONTEND_DIST}/" "${WEB_ROOT}/"
success "Frontend files copied to ${WEB_ROOT}"

# =============================================================================
#  PM2 ECOSYSTEM CONFIG
# =============================================================================
header "Writing PM2 ecosystem config"

mkdir -p /var/log/pm2

cat > "${APP_DIR}/ecosystem.config.cjs" <<'ECOSYSTEM'
// PM2 Ecosystem — AstraNodes
// SQLite requires fork mode (single writer — do NOT use cluster)
module.exports = {
  apps: [
    {
      name: "astranodes-api",
      script: "./src/server.js",
      cwd: "APP_DIR_PLACEHOLDER/backend",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      restart_delay: 3000,
      max_restarts: 10,
      env_production: {
        NODE_ENV: "production",
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/var/log/pm2/astranodes-error.log",
      out_file:   "/var/log/pm2/astranodes-out.log",
      merge_logs: true,
    },
  ],
}
ECOSYSTEM

# Replace the placeholder with the actual install directory
sed -i "s|APP_DIR_PLACEHOLDER|${APP_DIR}|g" "${APP_DIR}/ecosystem.config.cjs"

success "ecosystem.config.cjs written"

# =============================================================================
#  NGINX CONFIG
# =============================================================================
header "Writing Nginx configuration"

NGINX_CONF="/etc/nginx/sites-available/astranodes"

# Write HTTP-only config first — SSL paths don't exist yet so we can't include them.
# Certbot will automatically rewrite this file to add the HTTPS block and redirect.
cat > "$NGINX_CONF" <<NGINXCONF
# AstraNodes — Nginx config for ${DOMAIN}
# NOTE: Certbot will automatically add the SSL/HTTPS block below during deployment.
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};

    # Let's Encrypt ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # ── API reverse proxy ──────────────────────────────────────────────────
    location /api/ {
        proxy_pass         http://127.0.0.1:${APP_PORT}/api/;
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_read_timeout 60s;
        client_max_body_size 10M;
    }

    # ── Socket.io ──────────────────────────────────────────────────────────
    location /socket.io/ {
        proxy_pass         http://127.0.0.1:${APP_PORT}/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    \$http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host       \$host;
        proxy_set_header   X-Real-IP  \$remote_addr;
        proxy_read_timeout 86400s;
    }

    # ── Uploaded files ─────────────────────────────────────────────────────
    location /uploads/ {
        proxy_pass       http://127.0.0.1:${APP_PORT}/uploads/;
        proxy_set_header Host \$host;
    }

    # ── Block direct access to SQLite DB ──────────────────────────────────
    location ~* \.sqlite3?\$ {
        deny all;
    }

    # ── Security headers ──────────────────────────────────────────────────
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # ── React SPA (frontend) ──────────────────────────────────────────────
    root  ${WEB_ROOT};
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2|woff|ttf|eot)\$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
}
NGINXCONF

# Enable site
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/astranodes
rm -f /etc/nginx/sites-enabled/default

nginx -t && success "Nginx config valid"

# =============================================================================
#  FIREWALL (UFW)
# =============================================================================
header "Configuring UFW firewall"

ufw allow OpenSSH    > /dev/null
ufw allow 'Nginx Full' > /dev/null
# Internal port must NOT be public
ufw deny "${APP_PORT}" > /dev/null 2>&1 || true
ufw --force enable > /dev/null
success "UFW enabled  (SSH + HTTP/HTTPS open, port ${APP_PORT} blocked externally)"

# =============================================================================
#  CERTBOT — Let's Encrypt SSL
# =============================================================================
header "Obtaining SSL certificate via Let's Encrypt"

# Ensure Nginx is running so HTTP challenge works
systemctl start nginx
systemctl enable nginx

# Try with www first; if DNS for www isn't set up, fall back to domain-only
CERT_OK=false
certbot --nginx \
  --non-interactive \
  --agree-tos \
  --redirect \
  -m "$SSL_EMAIL" \
  -d "$DOMAIN" \
  -d "www.${DOMAIN}" && CERT_OK=true || true

if [[ "$CERT_OK" != "true" ]]; then
  warn "Certbot with www.${DOMAIN} failed (DNS not set up?). Retrying without www..."
  certbot --nginx \
    --non-interactive \
    --agree-tos \
    --redirect \
    -m "$SSL_EMAIL" \
    -d "$DOMAIN" && CERT_OK=true || true
fi

if [[ "$CERT_OK" == "true" ]]; then
  success "SSL certificate obtained"
else
  warn "Certbot failed — site will be HTTP only. Run 'certbot --nginx -d ${DOMAIN}' manually after fixing DNS."
fi

# Auto-renew cron (certbot installs one, but add a timer check)
systemctl enable --now certbot.timer 2>/dev/null || true

# =============================================================================
#  START WITH PM2
# =============================================================================
header "Starting API with PM2"

cd "$APP_DIR"

# Stop any existing instance
pm2 delete astranodes-api 2>/dev/null || true

pm2 start ecosystem.config.cjs --env production
pm2 save

# Set up PM2 to start on reboot
pm2 startup systemd -u root --hp /root | tail -1 | bash || true

success "PM2 started and saved"

# Reload Nginx to pick up Certbot's final changes
systemctl reload nginx

# =============================================================================
#  CREATE ADMIN ACCOUNT
# =============================================================================
header "Admin Account"

echo ""
echo -e "  ${CYAN}An admin account is required to access the dashboard.${RESET}"
ask_yn CREATE_ADMIN "Create the first admin account now?" "y"

if [[ "$CREATE_ADMIN" == "yes" ]]; then
  info "Running create-admin script..."
  npm --prefix "${APP_DIR}/backend" run create-admin
  success "Admin account created"
else
  echo ""
  echo -e "  ${YELLOW}Skipped. Run this later to create an admin:${RESET}"
  echo -e "  ${BOLD}npm --prefix ${APP_DIR}/backend run create-admin${RESET}"
fi

# =============================================================================
#  DONE
# =============================================================================
echo ""
echo -e "${BOLD}${GREEN}═══════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}${GREEN}  Deployment complete!${RESET}"
echo -e "${BOLD}${GREEN}═══════════════════════════════════════════════════════${RESET}"
echo ""
echo -e "  ${BOLD}Site:${RESET}           https://${DOMAIN}"
echo -e "  ${BOLD}API health:${RESET}     https://${DOMAIN}/api/health"
echo -e "  ${BOLD}PM2 status:${RESET}     pm2 status"
echo -e "  ${BOLD}API logs:${RESET}       pm2 logs astranodes-api"
echo -e "  ${BOLD}Nginx error:${RESET}    tail -f /var/log/nginx/error.log"
echo ""
echo -e "  ${CYAN}Node provisioning:${RESET} Fully automatic — all panel nodes"
echo -e "  are evaluated at each server purchase for memory, disk,"
echo -e "  and free allocations. No manual node ID is required."
echo ""
echo -e "  ${CYAN}Useful commands:${RESET}"
echo -e "   pm2 restart astranodes-api           # restart API"
echo -e "   pm2 logs astranodes-api --lines 100  # recent logs"
echo -e "   git -C ${APP_DIR} pull && pm2 restart astranodes-api  # update"
echo ""
