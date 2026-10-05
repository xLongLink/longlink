<div align="center">

<img src="banner.png" alt="LongLink banner" />

<br />

<a href="https://www.longlink.dev/">Website</a> &nbsp; · &nbsp; <a href="https://www.longlink.dev/docs/introduction/">Documentation</a> &nbsp; · &nbsp; <a href="https://github.com/xLongLink/sample">Sample</a> &nbsp; · &nbsp; <a href="https://pypi.org/project/longlink/">PyPI</a> &nbsp; · &nbsp; <a href="https://github.com/xLongLink/longlink/issues">Issues</a>

</div>

<br />

> [!WARNING]
> LongLink is under active development. APIs may change before 1.0.


## Introduction

LongLink is a code-first platform for building and operating process-specific business software with Python.

Build your Solution as a standard FastAPI application, using SQLModel for data and Pydantic for validation. LongLink provides the common runtime and services around the application: user management, permissions, database, storage, deployment, and logging.

The result is software you can develop, test, version, review, and change using normal engineering tools.


<br />

## Create a Solution

Requirements: `Python 3.12` or newer and [`uv`](https://docs.astral.sh/uv/).

```bash
uvx --from longlink longlink init --folder .
uv sync --group dev
uv run longlink dev
```

Open `http://127.0.0.1:1707` to preview your Solution.

> [!NOTE]
> See the [sample Solution](https://github.com/xLongLink/sample) for a complete example.

<details>
<summary>What about classic pip?</summary>

```bash
python -m pip install longlink
longlink init --folder .
python -m venv .venv
source .venv/bin/activate
python -m pip install -e .
longlink dev
```

</details>

<br />

## How it works

`LongLink()` is a headless FastAPI application with the common runtime already configured. Your routes remain standard FastAPI routes, while `Context` provides access to the current user, database, and storage.

The same code runs in development, testing, and production. When deployed, LongLink packages the Solution as a standard container image.

Each View is defined in a single file that describes its layout, elements, and actions.

![Invoice approvals in the sample Solution](sample.png)


<br />

## Why LongLink

AI has made custom software faster and cheaper to create. As the cost of building applications falls, more business processes can be expressed directly in software. However, without the right engineering foundations, complexity, fragility, and technical debt can gradually erode those initial benefits over time.

LongLink provides that foundation. It turns processes into maintainable business software built with Python. Each project becomes a Solution, while the Platform handles common needs: authentication, permissions, deployment, storage, logging, and governance.

Specific workflows can be customized through code, built quickly with modern AI-assisted tooling, and maintained using standard engineering practices. LongLink brings software-development principles to operational processes, making them testable, reviewable, and maintainable.

<br />

## Goals

- **Keep it simple**: Processes are clear, easy to operate and cheap to maintain.
- **Own the process**: Keep control and transparency over the process, its rules, and its data.
- **Separate responsibilities**: Clear distinction between a human decision and a machine task.

### Standards and governance

These principles align with [UN Sustainable Development Goal 9](https://sdgs.un.org/goals/goal9) and can support organisations implementing management systems and governance practices related to standards such as [ISO 9001](https://www.iso.org/standard/62085.html), [ISO 22301](https://www.iso.org/standard/75106.html), [ISO 37301](https://www.iso.org/standard/75080.html).

<br />

## Developing LongLink

The repository contains the LongLink SDK in `sdk/`, the Platform API in `api/`, and the frontend in `web/`.
On Linux, install the development requirements with:

```bash
make apt   # Ubuntu, Debian, ...
```

Work on the LongLink Platform, the default development credentials are `admin@admin.com` and `admin`:

```bash
make up     # Create local infrastructure
make api    # In one terminal
make seed   # In another terminal after the api is up
make web    # In another terminal
```

Work on the LongLink SDK runtime:

```bash
make sdk    # Run a standalone demo application locally
```

Clean up:

```bash
make down  # Stop local services and the cluster
```

<br />
<br />

---

<div align="center">
LongLink 2026

[License](./LICENSE) &nbsp; - &nbsp; [Contributing](./CONTRIBUTING.md) &nbsp; - &nbsp; [Code of Conduct](./CODE_OF_CONDUCT.md) &nbsp; - &nbsp; [Contact](mailto:info@longlink.dev)

</div>

---
