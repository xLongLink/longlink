# Sample LongLink app

<br />

## Setup using pip

<br />

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -e .
```

Start the app in development mode:

```bash
longlink dev
```

Build the application using docker:

```bash
longlink build
```

<br />

## Setup with uv (preferred)

```bash
uv sync 
# To upgrade the packages
# uv sync --upgrade
```

Start the app in development mode:

```bash
uv run longlink dev
```

Build the application using docker:

```bash
uv run longlink build
```

<br />

## TODO

- Add `ruff` for linting and formatting
- Add `mypy` or `pyright` for type checking
- Add pre-commit hooks for local automation
- Add CI for tests, linting, and type checks
- Add coverage reporting and a test matrix
