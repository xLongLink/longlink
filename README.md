<div align="center">

<img src="banner.png" alt="LongLink banner" />

<br />

<a href="https://www.longlink.dev/">Website</a> &nbsp; · &nbsp; <a href="https://www.longlink.dev/docs/">Documentation</a> &nbsp; · &nbsp; <a href="https://github.com/xLongLink/sample">Sample</a> &nbsp; · &nbsp; <a href="https://pypi.org/project/longlink/">PyPI</a> &nbsp; · &nbsp; <a href="https://github.com/xLongLink/longlink/issues">Issues</a>

</div>


<br />

## Introduction

LongLink is a code-first platform for building and operating process-specific business software with Python.

Build your Solution as a standard FastAPI application, using SQLModel for data and Pydantic for validation. LongLink provides the common runtime and services around the application: user management, permissions, database, storage, deployment, and logging.

The result is software you can develop, test, version, review, and change using normal engineering tools.

> [!WARNING]
> LongLink is under active development. APIs may change before 1.0.


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



A Solution keeps the application-specific parts of your software explicit and together:

```
src/
├── models/       # SQLModel data models
├── routes/       # FastAPI application logic
├── schemas/      # Pydantic schemas
├── views/        # User interfaces
└── envs.py       # Environment configuration
main.py           # Application entry point
```

`LongLink()` is a FastAPI application with the common runtime services already installed. Your routes remain standard FastAPI routes, while `Context` provides access to the current user, database session, and storage without requiring each Solution to configure those services independently.

The same application code runs across testing, development, and production. Local services are used while developing and testing, while the corresponding managed services are provided when running on the LongLink Platform.

When a Solution is ready to deploy, LongLink packages it with its locked dependencies, configuration requirements, and metadata into a standard container image.

> [!NOTE]
> LongLink introduces as little new surface area as possible. It brings established tools and standards together into a consistent environment, reducing the setup and integration work normally required for each application.

<br />

## Why LongLink

AI has made custom software faster and cheaper to create. As the cost of building applications falls, more business processes can be expressed directly in software. However, without the right engineering foundations, complexity, fragility, and technical debt can gradually erode those initial benefits over time.

LongLink provides that foundation. It turns real-world processes into maintainable business software built with Python. Each project becomes a Solution, while the Platform handles common needs: authentication, permissions, deployment, storage, logging, governance, and operational structure. Users define how the work should happen; developers focus on the business logic.

Specific workflows can be customized through code, built quickly with modern AI-assisted tooling, and maintained with the discipline of proper engineering. LongLink brings software-development principles to operational processes, making them structured, deployable, reviewable, and economical to maintain over time.


<br />

## Goals

- **Keep it simple**: Processes are clear, easy to operate and cheap to maintain.
- **Own the process**: Keep control and transparency over the process, its rules, and its data.
- **Separate responsibilities**: Clear distinction between a human decision and a machine task.

### Standards and governance

LongLink is designed around clear processes, accountability, traceability, and explicit separation between automated tasks and human decisions.

These principles align with [UN Sustainable Development Goal 9](https://sdgs.un.org/goals/goal9) and can support organisations implementing management systems and governance practices related to standards such as [ISO 9001](https://www.iso.org/standard/62085.html), [ISO 22301](https://www.iso.org/standard/75106.html), [ISO 31000](https://www.iso.org/standard/65694.html), [ISO 37301](https://www.iso.org/standard/75080.html), and [ISO 37000](https://www.iso.org/standard/65036.html).

<br />

## Developing LongLink

The repository contains the LongLink SDK and runtime in `sdk/`, the Platform API in `api/`, and the shared Platform and Solution frontend in `web/`.


On Linux, install the development requirements with:

```bash
make apt   # Ubuntu, Debian, ...
```

Work on the LongLink Platform:

```bash
make up     # Create local infrastructure
make api    # In one terminal
make seed   # In another terminal after the api is up
make web    # In another terminal
```

Work on the LongLink SDK runtime:

```bash
make sdk
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
