# Sample LongLink app

Internal ordering system for office hardware: keyboards, mice, monitors, and other equipment.

Employees browse available products, create requisition requests, and track order status.

## Build and publish to a k3d registry

`longlink build` now performs a full container build flow for this sample:

1. Generates `Dockerfile` and `manifest.json` in the project root.
2. Builds a Docker image tagged with the app name and a timestamp version.
3. Pushes that image to a Docker registry (default: `localhost:5000`, which is common for local k3d setups).

### Prerequisites

- Docker daemon is running.
- A k3d registry is available and reachable from Docker.

If you need to create a local registry with k3d:

```bash
k3d registry create compute-registry --port 5000
```

### Build and push using default registry

```bash
longlink build
```

### Build and push using a custom k3d registry endpoint

```bash
longlink build --registry my-registry.localhost:5001
```

After a successful run, the CLI prints the exact image tag that was pushed.
