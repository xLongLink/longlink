# Testing

Applications built with the LongLink SDK can be tested using standard [pytest](https://docs.pytest.org/en/stable/) and [pytest-asyncio](https://pytest-asyncio.readthedocs.io/en/stable/) workflows. When a project is generated, these tools are already included as development dependencies in the pyproject.toml file.

To install the development dependencies, run:

::: code-group

```bash [pip]
pip install .[dev]
```

```bash [uv]
uv add .[dev]
```

:::

## Usage

You can execute all tests or target a specific test file using the following commands. Use `sdk/tests` for SDK test files and keep file paths aligned with the repository layout:

```bash
pytest
pytest sdk/tests/cli/test_init.py
```

## Example

Illustrative snippet: asynchronous testing with `pytest`

```py
import pytest

@pytest.mark.asyncio
async def test_healthcheck(client):
    response = await client.get('/health')

    assert response.status_code == 200
```

Illustrative snippet: testing with FastAPI [`TestClient`](https://fastapi.tiangolo.com/tutorial/testing/)

```py
from app import app
from fastapi.testclient import TestClient

client = TestClient(app)

def test_healthcheck():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

## Resouces

- [FastAPI TestClient](https://fastapi.tiangolo.com/tutorial/testing/)
- [pytest Documentation](https://docs.pytest.org/)
- [pytest GitHub](https://github.com/pytest-dev/pytest)
- [pytest-asyncio Documentation](https://pytest-asyncio.readthedocs.io/en/stable/)
- [pytest-asyncio Github](https://github.com/pytest-dev/pytest-asyncio)
