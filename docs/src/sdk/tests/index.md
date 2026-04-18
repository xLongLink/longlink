# Testing

You can test LongLink SDK applications with standard `pytest` patterns.
Use async tests when your test targets async routes, async database operations, or async service calls.

## Usage

Install test dependencies:

```bash
pip install pytest pytest-asyncio
```

Run all tests:

```bash
pytest
```

Run one test file:

```bash
pytest tests/test_app.py
```

Mark async tests with `pytest.mark.asyncio`:

```py
import pytest


@pytest.mark.asyncio
async def test_healthcheck(client):
    response = await client.get('/health')

    assert response.status_code == 200
```

## Resources

- [FastAPI testing guide](https://fastapi.tiangolo.com/tutorial/testing/)
- [pytest documentation](https://docs.pytest.org/)
- [pytest-asyncio documentation](https://pytest-asyncio.readthedocs.io/)
