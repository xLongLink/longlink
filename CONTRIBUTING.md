# Contributing to LongLink

The control plane owns authentication, authorization, orchestration, storage, and application routing.

The web package owns the shared frontend runtime and the XML rendering path used by both the control plane and SDK bundles.

The SDK owns application-facing Python helpers, CLI commands, database helpers, and packaged XML schema assets.


<br />

## Architecture

```
longlink/
├── api/           # Control plane API and XML page sources
├── sdk/           # Python SDK for application development
└── web/           # Frontend runtime and shared XML renderer
```

<br />

## Development

```bash
make install    # Install all the dependencies
make format     # Format the code
make build      # Build the web UI into the packaged .static/web assets
```

### Control plane

```bash
make up     # Start the services, initialize the cluster
make web    # Run the web app proxied to the api app
make api    # Run the control plane
make down   # Stop services and remove the cluster
```

## Release

The release workflow runs on `v*` tag pushes and publishes the release automatically.

```bash
git tag vX.Y.Z
git push origin vX.Y.Z

# delete local tag
git tag -d vX.Y.Z
git push origin :refs/tags/vX.Y.Z
git tag vX.Y.Z
git push origin vX.Y.Z
```
