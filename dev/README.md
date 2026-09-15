<div align="center">

<img src="https://www.longlink.dev/logo.svg" alt="LongLink logo" />

[Website](https://longlink.dev) &nbsp; - &nbsp; [Docs](https://longlink.dev/docs) &nbsp; - &nbsp; [Issues](https://github.com/xLongLink/longlink/issues)

</div>

<br />
<br />

# Local development

The API runs on the host. `dev/` owns local infrastructure, including the
workstation-only Compute DNS bootstrap.

Requirements: Linux AMD64, Docker, k3d, kubectl, OpenSSL, curl, Helm,
uv, Vite+, and `storage.localhost` resolving to loopback.

## Start

```bash
make install
make up
```

Run these in separate terminals:

```bash
make api
make web
```

After the API starts, provision the sample:

```bash
make image
make seed
```

Open `http://localhost:5173`. Mailpit is available at `http://localhost:8025`.

## Reset

Stop API workers before `make up` or `make down`. Run `make up` again to reapply
local infrastructure. `make down` deletes the local cluster and tenant data, but
keeps `api/.env` and `sdk/dev`.

See [`k8s/README.md`](../k8s/README.md) for Compute package deployment.

<br />
<br />

---

<div align="center">
LongLink 2026

[License](../LICENSE) &nbsp; - &nbsp; [Contributing](../CONTRIBUTING.md) &nbsp; - &nbsp; [Code of Conduct](../CODE_OF_CONDUCT.md) &nbsp; - &nbsp; [Contact](mailto:info@longlink.dev)

</div>

---
