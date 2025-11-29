#!/usr/bin/env bash
set -euo pipefail
VPS=${1:-}                              # first arg = VPS IP or hostname
VPS_PORT=${2:-51820}                    # UDP port you want WG to listen on
CLIENT_NAME=${3:-laptop}                # client config file name
if [[ -z $VPS ]]; then
  echo "Usage: $0 <VPS-IP-or-hostname> [UDP-port] [client-name]"
  exit 1
fi

# ---------- keys ----------
umask 077
wg genkey | tee "$CLIENT_NAME.key" | wg pubkey > "$CLIENT_NAME.pub"
CLIENT_PRIV=$(cat "$CLIENT_NAME.key")
CLIENT_PUB=$(cat "$CLIENT_NAME.pub")

VPS_PRIV=$(ssh root@"$VPS" "wg genkey")
VPS_PUB=$(echo "$VPS_PRIV" | wg pubkey)

# ---------- configs ----------
cat > "$CLIENT_NAME.conf" <<EOF
[Interface]
PrivateKey = $CLIENT_PRIV
Address = 10.200.0.2/32
DNS = 1.1.1.1, 8.8.8.8

[Peer]
PublicKey = $VPS_PUB
Endpoint = $VPS:$VPS_PORT
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25
EOF

cat > vps-wg0.conf <<EOF
[Interface]
PrivateKey = $VPS_PRIV
Address = 10.200.0.1/24
ListenPort = $VPS_PORT

[Peer]
# $CLIENT_NAME
PublicKey = $CLIENT_PUB
AllowedIPs = 10.200.0.2/32
EOF

# ---------- VPS install ----------
echo ">>> Copying config to VPS and starting WireGuard..."
ssh root@"$VPS" "cat > /etc/wireguard/wg0.conf" < vps-wg0.conf
ssh root@"$VPS" "systemctl enable --now wg-quick@wg0"

# ---------- PC install ----------
sudo cp "$CLIENT_NAME.conf" /etc/wireguard/"$CLIENT_NAME.conf"
sudo systemctl enable --now wg-quick@"$CLIENT_NAME"

# ---------- Android QR ----------
for n in 1 2 3; do
  PHONE_CONF="phone$n.conf"
  wg genkey | tee "${PHONE_CONF}.key" | wg pubkey > "${PHONE_CONF}.pub"
  PHONE_PRIV=$(cat "${PHONE_CONF}.key")
  PHONE_PUB=$(cat "${PHONE_CONF}.pub")

  cat > "${PHONE_CONF}" <<EOF
[Interface]
PrivateKey = $PHONE_PRIV
Address = 10.200.0.$((n+2))/32
DNS = 1.1.1.1, 8.8.8.8

[Peer]
PublicKey = $VPS_PUB
Endpoint = $VPS:$VPS_PORT
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25
EOF

  echo ">>> QR for phone$n (scan with WireGuard app):"
  qrencode -t ansiutf8 < "${PHONE_CONF}"
  # also save a PNG if you prefer
  qrencode -s 10 -o "${PHONE_CONF}.png" < "${PHONE_CONF}"
done

echo ">>> PC tunnel active; test with:"
echo "  curl -x socks5h://127.0.0.1:29999 https://speed.cloudflare.com/__down?bytes=200000000 -o /dev/null"
echo "  or simply:  curl https://speed.cloudflare.com/__down?bytes=200000000 -o /dev/null"