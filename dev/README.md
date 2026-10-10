<div align="center">

<img src="../banner.png" alt="LongLink banner" />

</div>

## Local development

The API runs on the host. `dev/` owns the local cluster, connectivity
configuration, and supporting services.

Requirements: Linux AMD64, Docker, k3d, kubectl, OpenSSL, curl, Helm,
uv, Vite+, and `storage.localhost` resolving to loopback.

### Temporary HTTPS tunnel

With the local API running (`make api`), run `make tunnel` in another terminal.
It installs a checksum-verified `cloudflared` binary in `~/.local/bin` if needed
(Linux AMD64), then prints a temporary public HTTPS URL for port 8000.
Press Ctrl+C to stop the tunnel.

For ChatGPT OAuth testing, set `PUBLIC_URL` in `api/.env` to that HTTPS origin
and restart `make api`. Use
`https://<tunnel-host>/api/v1/solutions/<solution-id>/proxy/mcp` as the MCP URL.
Each new tunnel gets a new hostname. Restore `PUBLIC_URL=http://localhost:5173`
and restart the API after testing. Anyone with the tunnel URL can reach the API;
Quick Tunnels are for testing only and do not support SSE.

<br />

---

<div align="center">
LongLink 2026

[License](../LICENSE) &nbsp; - &nbsp; [Contributing](../CONTRIBUTING.md) &nbsp; - &nbsp; [Code of Conduct](../CODE_OF_CONDUCT.md) &nbsp; - &nbsp; [Contact](mailto:info@longlink.dev)

</div>

---
