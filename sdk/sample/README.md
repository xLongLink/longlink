# Sample LongLink app

Internal ordering system for office hardware: keyboards, mice, monitors, and other equipment.

Employees browse available products, create requisition requests, and track order status.

## Build and publish to a k3d registry

`longlink build` now performs a full container build flow for this sample:

1. Generates `Dockerfile` and `manifest.json` in the project root.
2. Builds a Docker image tagged with the app name and a timestamp version.
3. Pushes to the push registry (`localhost:5000` by default, reachable from the Docker host).
4. Outputs the K8s pull reference (`compute-registry:5000/...`) for the Applications page.

Because Docker and k3d resolve the registry by different names, the push uses `localhost:5000`
(host) while K8s pulls using `compute-registry:5000` (cluster-internal). They are the same registry.

### Prerequisites

- Docker daemon is running.
- A k3d cluster is created with `--registry-create compute-registry:0.0.0.0:5000`.

### Build and push using default registry

From `sdk/sample`:

```bash
longlink build
```

### Build and push using a stable local development tag

From `sdk/sample`:

```bash
longlink build --tag dev
```

This replaces `localhost:5000/sampleapp:dev` on each build instead of creating a new timestamped image tag.

### Build and push to a custom registry

From `sdk/sample`:

```bash
longlink build --registry my-registry.localhost:5001 --pull-registry my-registry:5001
```

After a successful run, the CLI prints the exact image tag that was pushed and the K8s reference to use.
