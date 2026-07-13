# Contributing to LongLink

The LongLink Platform owns authentication, authorization, orchestration, storage, and application routing.

The web package owns the shared frontend runtime and the XML rendering path used by both platform and SDK bundles.

The SDK owns application-facing Python helpers, CLI commands, database helpers, and packaged XML schema assets.

<br />

## Development

```bash
make install        # Install all the dependencies
make api:install    # Install API dependencies
make sdk:install    # Install SDK dependencies
make org:install    # Install org dependencies
make web:install    # Install web dependencies

make build          # Typecheck and build API and SDK web bundles
make api:build      # Build the API web bundle
make sdk:build      # Build the embedded SDK web bundle

make seed           # Start the stack, build/push the SDK app image, migrate, and seed

make clean          # Remove generated build and test artifacts
make api:clean      # Remove API generated artifacts and API web bundle
make sdk:clean      # Remove SDK generated artifacts, SDK dev app, and SDK web bundle
make org:clean      # Remove org generated artifacts
make web:clean      # Remove web generated artifacts

make format         # Format the code
make api:format     # Format API code
make sdk:format     # Format SDK code
make org:format     # Format org code
make web:format     # Format web and docs code

make pyright        # Run API, SDK, and org type checks
make api:pyright    # Run API type checks
make sdk:pyright    # Run SDK type checks
make org:pyright    # Run org type checks

make tests          # Run API, SDK, org, and web tests
make api:tests      # Run API tests
make sdk:tests      # Run SDK tests
make org:tests      # Run org tests
make web:tests      # Run web tests, typecheck, and bundle builds

make up             # Start the services, initialize the cluster
make web            # Run the Vite web app
make seed           # Prepare local services and seed data without starting the API server
make api            # Run the LongLink Platform API after seeding

make down           # Stop services, remove local volumes, and remove the cluster
```

## Test the SDK in development

```bash
make sdk            # Build the SDK web bundle and run the generated SDK app
```

## Test the SDK in production

```bash
make seed           # Start local services, build/push the SDK app image, migrate, and seed
make api            # Start the LongLink Platform API
make web            # Start the Vite platform frontend
```

After `make api` and `make web` are running, SDK image changes can be refreshed without restarting them:

```bash
make seed           # Rebuild/push localhost:15000/longlink-app:dev and reapply the seeded app
```
