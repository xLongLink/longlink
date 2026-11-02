<div align="center">

<img src="../banner.png" alt="LongLink banner" />

</div>

## Local development

The API runs on the host. `dev/` owns the local cluster, connectivity
configuration, and supporting services.

Requirements: Linux AMD64, Docker, k3d, kubectl, OpenSSL, curl, Helm,
uv, Vite+, and `storage.localhost` resolving to loopback.

### Recreate the sample

With the infrastructure and API running (`make up` and `make api`), run `make seed`.
It regenerates `sdk/dev` from the current SDK starter, rebuilds the image, deletes
the existing `invoices` sample in the development Organization through the Platform API, and creates a
fresh Solution. This resets the sample's database, attachments, and local edits
so its initial migration seeds the four building projects again.

The command waits for cleanup and deployment to finish, then prints the Projects
URL. It preserves the Organization, accounts, infrastructure, and other Solutions.
Use `make image` instead when you want to build without resetting the sample.

### Local Stripe testing

Set `STRIPE_SECRET_KEY=sk_test_...` in `api/.env`, then run `make stripe`.
It installs a checksum-verified CLI in `dev/bin/` and forwards
card-registration events to `/api/v1/stripe/webhook`. On first use, authorize the CLI
with `dev/bin/stripe login`, then rerun `make stripe`.
Copy the listener's signing secret into `STRIPE_WEBHOOK_SECRET` and restart `make api`.

Organization Settings → Usage shows included usage, monthly rates, and registered cards.
Use test card `4242 4242 4242 4242`, any future expiry, and any three-digit CVC.
No payment is taken during registration. The API's monthly worker creates usage invoices
at the start of each UTC month and Stripe collects them from the saved card.
Review the provisional storage rates before using live credentials.

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
