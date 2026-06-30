# Contributing to LongLink

The control plane owns authentication, authorization, orchestration, storage, and application routing.

The web package owns the shared frontend runtime and the XML rendering path used by both the control plane and SDK bundles.

The SDK owns application-facing Python helpers, CLI commands, database helpers, and packaged XML schema assets.

<br />

## Development

```bash
make install    # Install all the dependencies
make format     # Format the code
make build      # Typecheck and build API and SDK web bundles
make tests      # Run API, SDK, and web tests
make up         # Start the services, initialize the cluster
make web        # Run the Vite web app
make api        # Run the control plane
make sdk        # Run the generated SDK development application
make sdk:build  # Build and push the generated SDK app to the local registry
make down       # Stop services and remove the cluster
make format     # Format the code before committing
```

> Note: after `make up`, the Keycloak instance takes a few seconds to boot. Running `make api` immediately after `make up` might fail.
e