
--------------------------------------------------
speedup-ssh-tunnel.sh
--------------------------------------------------
```bash
#!/usr/bin/env bash
set -euo pipefail

# ----------- defaults -----------
JUMP_HOST=""
JUMP_PORT=22
SOCKS_PORT=29999
SYSTEMD_USER="$USER"
SERVICE_NAME="stunnel-auto"
# --------------------------------

usage(){
  cat <<EOF
Usage: $0 -j JUMP_HOST [-p JUMP_PORT] [-d SOCKS_PORT] [-u SYSTEMD_USER] [--remove]

  -j  VPS hostname or IP        (required)
  -p  VPS SSH port              (default 22)
  -d  Local SOCKS port          (default 29999)
  -u  User that will run autossh (default \$USER)
  --remove  Undo everything (iptables rules, sysctl, service)
EOF
  exit 1
}

while [[ $# -gt 0 ]]; do
  case $1 in
    -j) JUMP_HOST="$2"; shift 2 ;;
    -p) JUMP_PORT="$2"; shift 2 ;;
    -d) SOCKS_PORT="$2"; shift 2 ;;
    -u) SYSTEMD_USER="$2"; shift 2 ;;
    --remove) REMOVE=1; shift ;;
    *) usage ;;
  esac
done

[[ -n "${JUMP_HOST:-}" || "${REMOVE:-0}" == 1 ]] || usage

# ------------- helpers -------------
has() { command -v "$1" >/dev/null 2>&1; }
log() { echo "[$(date +%H:%M:%S)] $*" ; }

# ------------- removal -------------
if [[ "${REMOVE:-0}" == 1 ]]; then
  log "Removing optimisations…"
  sudo systemctl stop "$SERVICE_NAME" 2>/dev/null || true
  sudo systemctl disable "$SERVICE_NAME" 2>/dev/null || true
  sudo rm -f /etc/systemd/system/"$SERVICE_NAME".service
  sudo systemctl daemon-reload
  # iptables
  sudo iptables -t mangle -D OUTPUT -p tcp --tcp-flags SYN,RST SYN -j SSH_CLAMP 2>/dev/null || true
  sudo iptables -t mangle -F SSH_CLAMP 2>/dev/null || true
  sudo iptables -t mangle -X SSH_CLAMP 2>/dev/null || true
  sudo netfilter-persistent save
  # sysctl
  sudo rm -f /etc/sysctl.d/99-bbr.conf
  sudo sysctl --system
  log "Undo complete. Reboot to return to kernel defaults."
  exit 0
fi

# ------------- pkgs -------------
log "Installing packages…"
sudo apt-get update -qq
sudo apt-get install -y autossh iptables-persistent netfilter-persistent

# ------------- sysctl -------------
log "Writing BBR & buffer sysctl…"
sudo tee /etc/sysctl.d/99-bbr.conf >/dev/null <<'EOF'
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr
net.core.rmem_max = 268435456
net.core.wmem_max = 268435456
net.ipv4.tcp_rmem = 4096 262144 268435456
net.ipv4.tcp_wmem = 4096 262144 268435456
EOF
sudo sysctl --system

# ------------- iptables -------------
log "Clamping TCP MSS to 1360…"
sudo iptables -t mangle -N SSH_CLAMP 2>/dev/null || true
sudo iptables -t mangle -C OUTPUT -p tcp --tcp-flags SYN,RST SYN -j SSH_CLAMP 2>/dev/null \
  || sudo iptables -t mangle -I OUTPUT -p tcp --tcp-flags SYN,RST SYN -j SSH_CLAMP
sudo iptables -t mangle -C SSH_CLAMP -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --set-mss 1360 2>/dev/null \
  || sudo iptables -t mangle -A SSH_CLAMP -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --set-mss 1360
sudo netfilter-persistent save

# ------------- systemd service -------------
log "Creating systemd service $SERVICE_NAME…"
sudo tee /etc/systemd/system/"$SERVICE_NAME".service >/dev/null <<EOF
[Unit]
Description=High-speed SSH SOCKS (autossh)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
Environment="AUTOSSH_GATETIME=0"
Environment="AUTOSSH_POLL=2"
ExecStart=/usr/bin/autossh -M 0 -N \
  -o ServerAliveInterval=3 -o ServerAliveCountMax=3 \
  -o ExitOnForwardFailure=yes -o Compression=no \
  -o IPQoS=throughput -o Cipher=aes256-gcm@openssh.com \
  -D ${SOCKS_PORT} root@${JUMP_HOST} -p ${JUMP_PORT}
Restart=always
RestartSec=2
User=${SYSTEMD_USER}

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now "$SERVICE_NAME"

# ------------- done -------------
log "SOCKS proxy ready on localhost:$SOCKS_PORT"
log "Test:  curl -x socks5h://127.0.0.1:$SOCKS_PORT https://speed.cloudflare.com/__down?bytes=200000000 -o /dev/null"