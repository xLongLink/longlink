<div align="center">

<img src="web/public/banner.png" width="49.5%" />

[![PyPI version](https://img.shields.io/pypi/v/longlink)](https://pypi.org/project/longlink/)
[![Python versions](https://img.shields.io/pypi/pyversions/longlink)](https://pypi.org/project/longlink/)
[![License](https://img.shields.io/github/license/xLongLink/longlink)](https://github.com/xLongLink/longlink/blob/main/LICENSE)

[Website](https://longlink.dev) &nbsp; - &nbsp; [Docs](https://docs.longlink.dev) &nbsp; - &nbsp; [TODO]()

</div>

## Why

Longlink exists to make internal tools and product extensions faster to build, ship, and operate.
It combines a control plane, a frontend shell, and an SDK so teams can focus on application logic instead of rebuilding auth, organization management, UI integration, and deployment workflows for every new app.
The goal is to provide a consistent platform where applications feel native, stay manageable, and can evolve without each team maintaining its own stack.

<br />

## Goals

- Provide a single platform for managing organizations, users, modules, and application data.
- Make it easy to build new platform apps with a Python SDK.
- Keep frontend integration consistent so apps render natively inside the web application.
- Reduce repeated infrastructure work across authentication, permissions, publishing, and lifecycle management.
- Enable teams to move from idea to deployed app with a predictable developer workflow.

<br />

## Development


```bash
make format # Format the code
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
