

        chmod +x speedup-ssh-tunnel.sh
./speedup-ssh-tunnel.sh -h          # see options
sudo ./speedup-ssh-tunnel.sh -u myuser -j jump.server.com -p 22 -d 29999


# SSH-Tunnel Speed-Up Kit for Iran 5G / high-latency links

## What it does
- Fixes MTU black-hole (TCP MSS clamp to 1360)
- Enables BBR congestion control
- Raises TCP buffers for 200 ms+ RTT
- Replaces weak ciphers with AES-256-GCM (hardware-accelerated)
- Optionally creates a systemd autossh service that keeps a SOCKS proxy alive

## One-liner install
```bash
wget -q https://raw.githubusercontent.com/YOU/REPO/main/speedup-ssh-tunnel.sh
chmod +x speedup-ssh-tunnel.sh
sudo ./speedup-ssh-tunnel.sh -u $USER -j YOUR_VPS -p 22 -d 29999


curl -x socks5h://127.0.0.1:29999 https://speed.cloudflare.com/__down?bytes=200000000 -o /dev/null
# should show > 10 MB/s on 200 Mb/s 5G link