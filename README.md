<div align="center">

<img src="banner.png" width="49.5%" />

[![PyPI version](https://img.shields.io/pypi/v/longlink)](https://pypi.org/project/longlink/)
[![Python versions](https://img.shields.io/pypi/pyversions/longlink)](https://pypi.org/project/longlink/)

[Website](https://longlink.dev) &nbsp; - &nbsp; [Docs](https://docs.longlink.dev) &nbsp; - &nbsp; [TODO]()

</div>


## Why

<br />

## Goals

<br />

## Development

```bash
make setup # Install all local dependencies
```

```bash
make format
```

<br />

### Control plane

The control plane logic is located in the `api` folder:

```bash
make up     # Start the services, initialize the cluser
make web    # Run the web app proxied to the api app
make api    # Run the control plane
```

```bash
make down   # Stop services and remove the cluster
```

<br />

### Applications SDK

The applications SDK is located in the `sdk` folder:

```bash
make sdk    # Run the web app proxied to the sample app
make sample # Run the sample APP
```

<br />

### Documentation

The source code is located in `docs` folder:

```bash
make docs # Run the documentation site
```