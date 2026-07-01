# Contributing to LongLink

The control plane owns authentication, authorization, orchestration, storage, and application routing.

The web package owns the shared frontend runtime and the XML rendering path used by both the control plane and SDK bundles.

The SDK owns application-facing Python helpers, CLI commands, database helpers, and packaged XML schema assets.

<br />

## Development

```bash
make install        # Install all the dependencies
make api:install    # Install API dependencies
make sdk:install    # Install SDK dependencies
make web:install    # Install web dependencies

make build          # Typecheck and build API and SDK web bundles
make api:build      # Build the API web bundle
make sdk:build      # Build the embedded SDK web bundle

make sdl            # 
make sdk:image      # Build and push the generated SDK app to the local registry
make seed           # Run API migrations and refresh local seed data

make clean          # Remove generated build and test artifacts
make api:clean      # Remove API generated artifacts and API web bundle
make sdk:clean      # Remove SDK generated artifacts and SDK web bundle
make web:clean      # Remove web generated artifacts

make format         # Format the code
make api:format     # Format API code
make sdk:format     # Format SDK code
make web:format     # Format web and docs code

make pyright        # Run API and SDK type checks
make api:pyright    # Run API type checks
make sdk:pyright    # Run SDK type checks

make tests          # Run API, SDK, and web tests
make api:tests      # Run API tests
make sdk:tests      # Run SDK tests
make web:tests      # Run web tests, typecheck, and bundle builds

make up             # Start the services, initialize the cluster
make web            # Run the Vite web app
make api            # Run the control plane
make seed           # Refresh local seed data without starting the API server

make down           # Stop services and remove the cluster
```

## Test the SDK in development


```bash
make sdk            # Build the SDK web bundle and run the generated SDK app
```

## Test the SDK in production

```bash
make up             # Start local services, registry, and the k3d compute cluster
make sdk:image      # Build and push localhost:15000/longlink-app:dev
make api            # Run migrations, seed data, and start the control plane API
make web            # Start the Vite control-plane frontend
```

After `make api` and `make web` are running, SDK image changes can be refreshed without restarting them:

```bash
make sdk:image      # Rebuild and push localhost:15000/longlink-app:dev
make seed           # Reapply the seeded local app runtime
```
