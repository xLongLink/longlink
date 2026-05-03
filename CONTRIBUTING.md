# Contributing to LongLink

<br />

## Architecture

```
longlink/
├── api/           # Control plane
├── dev/           # Development tools
├── docs/          # Platform and SDK documentation
├── sdk/           # Python SDK for application development
└── web/           # Frontend runtime and control-plane UI integration
```

<br />

## Development

```bash
make install    # Install all the dependencies
make format     # Format the code
make build      # Build the web UI into .static/web for the sdk and api
```

### Control plane

```bash
make up     # Start the services, initialize the cluster
make web    # Run the web app proxied to the api app
make api    # Run the control plane
make down   # Stop services and remove the cluster
```

### Documentation

```bash
make docs # Run the documentation site
```

## Release

The release workflow runs on `v*` tag pushes and publishes the release automatically.

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```
