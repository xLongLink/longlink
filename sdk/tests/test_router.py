import pytest
from fastapi import FastAPI, APIRouter
from pathlib import Path
from longlink import LongLink
from fastapi.testclient import TestClient


def test_application_router_preserves_explicit_api_prefix(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """Expose Application routes under their explicit API prefix."""

    # Arrange
    router = APIRouter(prefix="/api")

    @router.get("/sample")
    async def sample_get_endpoint() -> dict[str, str]:
        """Return a sample payload."""

        return {"message": "ok"}

    (tmp_path / "src" / "i18n").mkdir(parents=True)
    (tmp_path / "src" / "pages").mkdir()
    monkeypatch.chdir(tmp_path)
    app = FastAPI()
    app.include_router(router)
    LongLink(app)

    client = TestClient(app)

    # Act
    response = client.get("/api/sample")
    root_response = client.get("/sample", headers={"accept": "application/json"})

    # Assert
    assert response.status_code == 200
    assert response.json() == {"message": "ok"}
    assert root_response.status_code == 404
