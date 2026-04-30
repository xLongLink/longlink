# Sample LongLink app

Internal ordering system for office hardware: keyboards, mice, monitors, and other equipment.

Employees browse available products, create requisition requests, and track order status.

## Build locally

`longlink build` now performs a local container build flow for this sample:

1. Generates `Dockerfile` and `manifest.json` in the project root.
2. Builds a Docker image tagged with the app name and a timestamp version.
3. Outputs the local image tag for reuse.

### Prerequisites

- Docker daemon is running.

### Build with the default tag

From `sdk/sample`:

```bash
longlink build
```

### Build with a stable local development tag

From `sdk/sample`:

```bash
longlink build --tag dev
```

This replaces `sampleapp:dev` on each build instead of creating a new timestamped image tag.

After a successful run, the CLI prints the image tag that was built.
