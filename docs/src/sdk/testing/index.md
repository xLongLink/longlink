# Testing

Applications built with the LongLink SDK can be tested using standard [pytest](https://docs.pytest.org/en/stable/) and [pytest-asyncio](https://pytest-asyncio.readthedocs.io/en/stable/) workflows. When a project is generated, these tools are already included as development dependencies in the pyproject.toml file.

To install the development dependencies, run:

```bash
pip install .[dev]
```

## Usage

You can execute all tests or target a specific test file using the following commands:

```bash
pytest
pytest tests/test_app.py
```

## Example

Asynchronous Testing with `pytest`

```py
import pytest

@pytest.mark.asyncio
async def test_healthcheck(client):
    response = await client.get('/health')

    assert response.status_code == 200
```

Testing with FastAPI [`TestClient`](https://fastapi.tiangolo.com/tutorial/testing/)

```py
from app import app
from fastapi.testclient import TestClient

client = TestClient(app)

def test_healthcheck():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

## Additional Resources

- [FastAPI TestClient](https://fastapi.tiangolo.com/tutorial/testing/)
- [pytest Documentation](https://docs.pytest.org/)
- [pytest GitHub](https://github.com/pytest-dev/pytest)
- [pytest-asyncio Documentation](https://pytest-asyncio.readthedocs.io/en/stable/)
- [pytest-asyncio Github](https://github.com/pytest-dev/pytest-asyncio)
