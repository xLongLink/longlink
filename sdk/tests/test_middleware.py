import gzip
import pytest
from httpx2 import Response as HttpxResponse
from fastapi import FastAPI
from starlette.types import Send, Scope, Message, Receive
from fastapi.responses import Response
from fastapi.testclient import TestClient
from longlink.middleware import FrontendMiddleware, accepts_gzip, install_frontend_middleware


def create_text_app(headers: dict[str, str], path: str = "/text", media_type: str = "text/plain") -> FastAPI:
    """Create a frontend application serving one eligible text response."""

    # Configure the response representation used by compression tests.
    app = FastAPI()

    @app.get(path)
    def get_text() -> Response:
        """Return a compressible text representation."""

        return Response("x" * 1000, media_type=media_type, headers=headers)

    install_frontend_middleware(app)
    return app


def request_response(app: FastAPI, path: str, headers: dict[str, str]) -> HttpxResponse:
    """Request one generated frontend response with a closed test client."""

    # Ensure each response is fully consumed before closing the in-process client.
    with TestClient(app) as client:
        return client.get(path, headers=headers)


@pytest.mark.parametrize(
    ("header", "expected"),
    [
        ("gzip;q=0, *;q=1", False),
        ("br;q=1, *;q=1", True),
        pytest.param("GZip", True, id="case-insensitive"),
        pytest.param("gzip;q=invalid", False, id="invalid-quality"),
        pytest.param("gzip;q=1.1", False, id="out-of-range-quality"),
        pytest.param("gzip; level=6", True, id="non-quality-parameter"),
        pytest.param("*;q=0", False, id="zero-wildcard-quality"),
        pytest.param("", False, id="missing-header"),
    ],
)
def test_accepts_gzip_interprets_encoding_quality_values(header: str, expected: bool) -> None:
    """Honor valid gzip and wildcard quality values while rejecting invalid values."""

    assert accepts_gzip(header) is expected


@pytest.mark.parametrize(
    ("accept_encoding", "expected_content_encoding"),
    [
        pytest.param("gzip", "gzip", id="gzip"),
        pytest.param("identity", None, id="identity"),
        pytest.param("gzip;q=0", None, id="gzip-refused"),
    ],
)
def test_frontend_middleware_varies_eligible_text_representations(accept_encoding: str, expected_content_encoding: str | None) -> None:
    """Keep gzip and identity text representations separately cacheable."""

    # Arrange
    app = create_text_app({"etag": '"text-v1"'})

    # Act
    response = request_response(app, "/text", {"accept-encoding": accept_encoding})

    # Assert
    assert response.status_code == 200
    assert response.content == b"x" * 1000
    assert response.headers.get("content-encoding") == expected_content_encoding
    assert response.headers["etag"] == 'W/"text-v1"'
    assert response.headers["vary"] == "Accept-Encoding"


def test_frontend_middleware_preserves_existing_vary_header_when_compressing() -> None:
    """Append encoding negotiation without discarding route-specific Vary values."""

    # Arrange
    app = create_text_app({"vary": "Origin"})

    # Act
    response = request_response(app, "/text", {"accept-encoding": "gzip"})

    # Assert
    assert response.headers["vary"] == "Origin, Accept-Encoding"


def test_frontend_middleware_preserves_identity_representation_for_range_requests() -> None:
    """Keep byte-range responses uncompressed with their original validator."""

    # Arrange
    app = create_text_app({"cache-control": "private", "etag": '"text-v1"'})

    # Act
    response = request_response(app, "/text", {"accept-encoding": "gzip", "range": "bytes=0-99"})

    # Assert
    assert response.status_code == 200
    assert "content-encoding" not in response.headers
    assert response.headers["etag"] == '"text-v1"'
    assert response.headers["cache-control"] == "private"


def test_frontend_middleware_preserves_incompressible_asset_representation() -> None:
    """Keep incompressible assets out of encoding negotiation."""

    # Arrange
    app = create_text_app({"etag": '"image-v1"'}, path="/assets/logo.png", media_type="image/png")

    # Act
    response = request_response(app, "/assets/logo.png", {"accept-encoding": "gzip"})

    # Assert
    assert response.status_code == 200
    assert response.content == b"x" * 1000
    assert "content-encoding" not in response.headers
    assert "vary" not in response.headers
    assert response.headers["etag"] == '"image-v1"'


def test_frontend_middleware_preserves_precompressed_text_representation() -> None:
    """Avoid double compression while retaining cache negotiation for encoded text."""

    # Arrange
    app = FastAPI()

    @app.get("/text")
    def get_text() -> Response:
        """Return a pre-compressed text representation."""

        return Response(
            gzip.compress(b"x" * 1000),
            media_type="text/plain",
            headers={"content-encoding": "gzip", "etag": '"text-v1"'},
        )

    install_frontend_middleware(app)

    # Act
    response = request_response(app, "/text", {"accept-encoding": "gzip"})

    # Assert
    assert response.status_code == 200
    assert response.content == b"x" * 1000
    assert response.headers["content-encoding"] == "gzip"
    assert response.headers["etag"] == 'W/"text-v1"'
    assert response.headers["vary"] == "Accept-Encoding"


async def test_frontend_middleware_passes_websocket_scopes_through_unchanged() -> None:
    """Leave non-HTTP ASGI scopes outside frontend response policy handling."""

    # Arrange
    received_scopes: list[Scope] = []

    async def application(scope: Scope, _receive: Receive, _send: Send) -> None:
        """Record the scope received by the wrapped ASGI application."""

        received_scopes.append(scope)

    scope: Scope = {"type": "websocket", "path": "/events", "headers": []}
    middleware = FrontendMiddleware(application)

    async def receive() -> Message:
        """Provide one unused WebSocket receive callable."""

        return {"type": "websocket.disconnect"}

    async def send(_message: Message) -> None:
        """Provide one unused WebSocket send callable."""

    # Act
    await middleware(scope, receive, send)

    # Assert
    assert received_scopes == [scope]


@pytest.mark.parametrize(
    ("path", "media_type", "status_code", "expected_cache_control"),
    [
        pytest.param("/dashboard", "text/html", 200, "no-cache", id="html"),
        pytest.param("/dashboard", "text/html", 206, "no-cache", id="partial-html"),
        pytest.param("/assets/app-abcdef12.js", "text/javascript", 200, "public, max-age=31536000, immutable", id="hashed-asset"),
        pytest.param("/assets/app-abcdef12.js", "text/javascript", 304, "public, max-age=31536000, immutable", id="not-modified-asset"),
        pytest.param("/assets/app.js", "text/javascript", 200, "no-cache", id="unhashed-asset"),
        pytest.param("/assets/missing.js", "text/javascript", 404, "no-store", id="missing-asset"),
        pytest.param("/favicon.ico", "image/x-icon", 200, "public, max-age=86400", id="favicon"),
    ],
)
def test_frontend_middleware_applies_default_cache_policy(
    path: str,
    media_type: str,
    status_code: int,
    expected_cache_control: str,
) -> None:
    """Apply cache defaults according to the frontend resource type."""

    # Arrange
    app = FastAPI()

    @app.get("/{resource:path}")
    def get_resource() -> Response:
        """Return a frontend resource without an explicit cache policy."""

        return Response("content", media_type=media_type, status_code=status_code)

    install_frontend_middleware(app)

    # Act
    response = request_response(app, path, {})

    # Assert
    assert response.status_code == status_code
    assert response.headers["cache-control"] == expected_cache_control


def test_frontend_middleware_preserves_explicit_cache_policy() -> None:
    """Leave route-owned cache policies unchanged."""

    # Arrange
    app = create_text_app({"cache-control": "private, no-store"})

    # Act
    response = request_response(app, "/text", {})

    # Assert
    assert response.status_code == 200
    assert response.content == b"x" * 1000
    assert response.headers["cache-control"] == "private, no-store"
