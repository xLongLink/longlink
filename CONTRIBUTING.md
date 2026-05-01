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
make build      # Build the web UI into .static folder for the sdk and the api
```

### Control plane

```bash
make up     # Start the services, initialize the cluser
make web    # Run the web app proxied to the api app
make api    # Run the control plane
make down   # Stop services and remove the cluster
```

### Documentation

```bash
make docs # Run the documentation site
```
