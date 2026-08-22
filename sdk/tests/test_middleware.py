import pytest
from fastapi import FastAPI
from fastapi.responses import Response
from fastapi.testclient import TestClient
from longlink.middleware import accepts_gzip, install_frontend_middleware


@pytest.mark.parametrize(
    ("header", "expected"),
    [("gzip;q=0, *;q=1", False), ("br;q=1, *;q=1", True)],
)
def test_accepts_gzip_respects_explicit_and_wildcard_quality_values(header: str, expected: bool) -> None:
    """Honor gzip's explicit quality value before a wildcard fallback."""

    # Arrange
    # Act
    accepted = accepts_gzip(header)

    # Assert
    assert accepted is expected


def test_frontend_middleware_compresses_and_weakens_eligible_text_response() -> None:
    """Compress eligible text responses and vary their weak validator by encoding."""

    # Arrange
    app = FastAPI()

    @app.get("/text")
    def get_text() -> Response:
        """Return a compressible text representation."""
        return Response("x" * 1000, media_type="text/plain", headers={"etag": '"text-v1"'})

    install_frontend_middleware(app)

    # Act
    with TestClient(app) as client:
        response = client.get("/text", headers={"accept-encoding": "gzip"})

    # Assert
    assert response.status_code == 200
    assert response.content == b"x" * 1000
    assert response.headers["content-encoding"] == "gzip"
    assert response.headers["etag"] == 'W/"text-v1"'
    assert response.headers["vary"] == "Accept-Encoding"


def test_frontend_middleware_preserves_identity_representation_for_range_requests() -> None:
    """Keep byte-range responses uncompressed with their original validator."""

    # Arrange
    app = FastAPI()

    @app.get("/text")
    def get_text() -> Response:
        """Return a text representation with an explicit cache policy."""
        return Response(
            "x" * 1000,
            media_type="text/plain",
            headers={"cache-control": "private", "etag": '"text-v1"'},
        )

    install_frontend_middleware(app)

    # Act
    with TestClient(app) as client:
        response = client.get("/text", headers={"accept-encoding": "gzip", "range": "bytes=0-99"})

    # Assert
    assert response.status_code == 200
    assert response.content == b"x" * 1000
    assert "content-encoding" not in response.headers
    assert response.headers["etag"] == '"text-v1"'
    assert response.headers["cache-control"] == "private"


@pytest.mark.parametrize(
    ("path", "media_type", "expected_cache_control"),
    [
        pytest.param("/dashboard", "text/html", "no-cache", id="html"),
        pytest.param("/assets/app-abcdef12.js", "text/javascript", "public, max-age=31536000, immutable", id="hashed-asset"),
        pytest.param("/assets/app.js", "text/javascript", "no-cache", id="unhashed-asset"),
        pytest.param("/favicon.ico", "image/x-icon", "public, max-age=86400", id="favicon"),
    ],
)
def test_frontend_middleware_applies_default_cache_policy(
    path: str,
    media_type: str,
    expected_cache_control: str,
) -> None:
    """Apply cache defaults according to the frontend resource type."""

    # Arrange
    app = FastAPI()

    @app.get("/{resource:path}")
    def get_resource() -> Response:
        """Return a frontend resource without an explicit cache policy."""

        return Response("content", media_type=media_type)

    install_frontend_middleware(app)

    # Act
    with TestClient(app) as client:
        response = client.get(path)

    # Assert
    assert response.status_code == 200
    assert response.headers["cache-control"] == expected_cache_control
