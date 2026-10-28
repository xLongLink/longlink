<div align="center">

<img src="banner.png" alt="LongLink banner" />


<h3 >
Create the tools your company always needed
</h3 >

Build dashboards, workflows, and internal tools tailored to your business using Python. <br /> LongLink provides everything you need to develop, deploy, and manage them in a single place


[![Tests](https://github.com/xLongLink/longlink/actions/workflows/tests.yml/badge.svg)](https://github.com/xLongLink/longlink/actions/workflows/tests.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Python versions](https://img.shields.io/pypi/pyversions/longlink)](https://pypi.org/project/longlink/)
[![PyPI version](https://img.shields.io/pypi/v/longlink)](https://pypi.org/project/longlink/)


</div>


<br />

## What it does

LongLink is an open-source platform for building and running custom business tools with Python:

- ⚡ **Built on FastAPI**: Use standard FastAPI routes, Pydantic, SQLModel, and your favorite Python libraries.
- 🖥️ **Built-in UI**: Build modern interfaces without the complexity of maintaining a complete frontend.
- 👥 **User management**: Built-in authentication, organizations, roles, and permissions.
- ☁️ **Managed infrastructure**: Databases, storage, logging, and deployment handled by the platform.
- 🤖 **AI integration**: Expose your applications to AI agents through an MCP server.
- 📦 **Portable**: Applications run as standard containers.



<br />

## Getting started

Requirements: Python 3.12 or later and [`uv`](https://docs.astral.sh/uv/).

```bash
uvx --from longlink longlink init --folder . --ci github
```

Open `http://127.0.0.1:1707` to preview your Solution. Changes to your application are automatically reloaded during development.

> [!WARNING]
> LongLink is under active development. APIs may change before version 1.0.



<br />

## How it works

A Solution is a conventional Python project where you define your data, logic, and user interface using established libraries, it follows:

```text
├── main.py             # Application entry point
├── src/
│   ├── models/         # SQLModel database models
│   ├── schemas/        # Pydantic schemas
│   ├── routes/         # FastAPI endpoints
│   └── views/          # JSX user interfaces
├── migrations/         # Database migrations
├── tests/              # Automated tests
└── pyproject.toml      # Project dependencies
```



<br />

## Where it can be used

LongLink is designed for business processes that need more than spreadsheets, manual work, or generic software. It lets you build applications tailored to how your organization actually operates:

- 🛠️ **Internal tools**: Build dashboards, admin / employee portals and custom applications for everyday operations.
- 🔄 **Workflow automation**: Manage approvals, requests, task assignments, and multi-step processes.
- 🗂️ **Data management**: Create applications to collect, validate, organize, and maintain business data.
- 📋 **Operations management**: Track orders, inventory, projects, resources, and other operational activities.



<br />

## Why LongLink

AI has made custom software faster and cheaper to create. As the cost of building applications falls, more business processes can be expressed directly in software. However, without the right engineering foundations, complexity, fragility, and technical debt can gradually erode those initial benefits over time.

LongLink provides that foundation. It turns processes into maintainable business software built with Python. Each project becomes a Solution, while the Platform handles common needs: authentication, permissions, deployment, storage, logging, and governance.

Specific workflows can be customized through code, built quickly with modern AI-assisted tooling, and maintained using standard engineering practices. LongLink brings software-development principles to operational processes, making them testable, reviewable, and maintainable.





<br />

## Contribute to LongLink

Run these commands from the repository root:


```bash
make apt   # Ubuntu, Debian, ...
```

### Develop the Platform

```bash
make up     # Create local infrastructure
make api    # Start the API and leave it running
make seed   # In another terminal, after API startup completes
make web    # In the second terminal, after seeding finishes
```

The default development email address is `admin@admin.com`, and the password is `admin`.

### Develop the SDK runtime

```bash
make sdk
```

### Stop local services


```bash
make down
```

<br />
<br />

---

<div align="center">
LongLink 2026

[License](./LICENSE) &nbsp; - &nbsp; [Contributing](./CONTRIBUTING.md) &nbsp; - &nbsp; [Code of Conduct](./CODE_OF_CONDUCT.md) &nbsp; - &nbsp; [Contact](mailto:info@longlink.dev)

</div>

---
