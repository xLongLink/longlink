# Contributing to LongLink

The LongLink Platform owns authentication, authorization, orchestration, storage, and application routing.

The web package owns the shared frontend runtime and the XML rendering path used by both platform and SDK bundles.

The SDK owns shared-schema models, migrations, and synchronization helpers alongside application-facing Python helpers, application migrations, CLI commands, database helpers, and packaged XML schema assets. The API executes shared migrations and writes with control-plane credentials; application runtimes receive read-only shared access.

<br />

## Development

Install [Vite+](https://viteplus.dev) before running the web commands:

```bash
curl -fsSL https://vite.plus | bash
. "$HOME/.vite-plus/env"
vp env setup
```

```bash
make install        # Install all the dependencies
make api:install    # Install API dependencies
make sdk:install    # Install SDK dependencies
make web:install    # Install web dependencies

make build          # Typecheck and build API and SDK web bundles
make api:build      # Build the API web bundle
make sdk:build      # Build the embedded SDK web bundle

make seed           # Start the stack, build/push the SDK app image, migrate, and seed

make clean          # Remove generated build and test artifacts
make api:clean      # Remove API generated artifacts and API web bundle
make sdk:clean      # Remove SDK generated artifacts, SDK dev app, and SDK web bundle
make web:clean      # Remove web generated artifacts

make format         # Format the code
make api:format     # Format API code
make sdk:format     # Format SDK code
make web:format     # Format web and docs code

make ty             # Run API and SDK type checks
make api:ty         # Run API type checks
make sdk:ty         # Run SDK type checks

make local          # Initialize local services, cluster, and Application image
make web            # Run the Vite web app
make api            # Run the LongLink Platform API after seeding

make down           # Remove remote development resources, local services, volumes, and the cluster
```

## Test the SDK in development

```bash
make sdk            # Build the SDK web bundle and run the generated SDK app
```

## Test the SDK in production

```bash
make seed           # Start local services, pull the seed Application image, migrate, and seed
make api            # Start the LongLink Platform API
make web            # Start the Vite platform frontend
```

After `make api` and `make web` are running, a different published Application image can be seeded without restarting them:

```bash
make seed APPLICATION_IMAGE=ghcr.io/xlonglink/longlink-app:v0.0.2
```
