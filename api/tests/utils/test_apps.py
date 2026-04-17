import pytest
from src.utils import apps


@pytest.mark.unit
@pytest.mark.asyncio
async def test_request_raises_when_app_missing(monkeypatch):
    """Request helper should fail when target app is not registered in database."""

    class _AppsService:
        async def get_by_uuid(self, _uuid: str):
            """Return missing app for every lookup."""
            return None

    apps._clients.clear()
    monkeypatch.setattr(apps.db, "apps", _AppsService())

    with pytest.raises(ValueError, match="App not found"):
        await apps.request("missing-app", "GET", "/health")

    apps._clients.clear()
