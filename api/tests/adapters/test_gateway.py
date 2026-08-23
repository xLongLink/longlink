import pytest
import asyncio
from uuid import uuid4
from typing import cast
from src.adapters import gateway
from collections.abc import AsyncIterator

pytestmark = pytest.mark.no_db


async def content() -> AsyncIterator[bytes]:
    """Provide an empty streaming request body."""

    if False:
        yield b""


async def test_gateway_response_closes_client_when_response_close_fails() -> None:
    """Close the owning HTTP client even when the streamed response fails to close."""

    # Provide independently observable response and client cleanup paths.
    class Response:
        async def aclose(self) -> None:
            """Fail response cleanup."""

            raise RuntimeError("response close failed")

    class Client:
        def __init__(self) -> None:
            """Initialize cleanup observation."""

            self.closed = False

        async def aclose(self) -> None:
            """Record client cleanup."""

            self.closed = True

    client = Client()

    # Assert the response failure remains visible after client cleanup.
    with pytest.raises(RuntimeError, match="response close failed"):
        await gateway.GatewayResponse(client, Response()).aclose()  # type: ignore[arg-type]
    assert client.closed


async def test_gateway_request_closes_client_when_send_is_cancelled(monkeypatch: pytest.MonkeyPatch) -> None:
    """Close the request client when cancellation interrupts response creation."""

    # Replace the transport after TLS setup with a cancellable request client.
    clients: list[Client] = []

    class Client:
        def __init__(self, **kwargs: object) -> None:
            """Record the constructed request client."""

            self.closed = False
            clients.append(self)

        def build_request(self, method: str, url: str, content: AsyncIterator[bytes], headers: dict[str, str]) -> object:
            """Build an opaque request accepted by the fake transport."""

            return object()

        async def send(self, request: object, stream: bool) -> None:
            """Cancel request submission."""

            raise asyncio.CancelledError()

        async def aclose(self) -> None:
            """Record client cleanup."""

            self.closed = True

    class TLS:
        def load_cert_chain(self, certfile: str) -> None:
            """Accept the temporary client identity."""

    monkeypatch.setattr(gateway.httpx2, "AsyncClient", Client)
    monkeypatch.setattr(gateway.ssl, "create_default_context", lambda cadata: TLS())
    client = gateway.GatewayClient("https://gateway.example", "", "")

    # Cancellation must propagate after the owning client has closed.
    with pytest.raises(asyncio.CancelledError):
        await client.request(
            application_id=uuid4(),
            user_id=uuid4(),
            method="GET",
            path="status",
            query="",
            content_type=None,
            content=content(),
        )
    assert clients[0].closed


async def test_gateway_request_forwards_identity_and_defers_cleanup(monkeypatch: pytest.MonkeyPatch) -> None:
    """Return the streamed gateway response until its caller finishes it."""

    # Arrange
    application_id = uuid4()
    user_id = uuid4()
    captured: dict[str, object] = {}

    class Response:
        async def aclose(self) -> None:
            """Record response cleanup."""

            captured["response_closed"] = True

    class Client:
        def __init__(self, **kwargs: object) -> None:
            """Capture the gateway client configuration."""

            captured["client_kwargs"] = kwargs

        def build_request(self, method: str, url: str, content: AsyncIterator[bytes], headers: dict[str, str]) -> object:
            """Capture one outbound gateway request."""

            captured["request"] = {"method": method, "url": url, "content": content, "headers": headers}
            return object()

        async def send(self, request: object, stream: bool) -> Response:
            """Return the upstream response without closing it."""

            captured["send"] = {"request": request, "stream": stream}
            return Response()

        async def aclose(self) -> None:
            """Record client cleanup."""

            captured["client_closed"] = True

    class TLS:
        def load_cert_chain(self, certfile: str) -> None:
            """Accept the temporary client identity."""

            captured["identity_path"] = certfile

    tls = TLS()
    monkeypatch.setattr(gateway.httpx2, "AsyncClient", Client)
    monkeypatch.setattr(gateway.ssl, "create_default_context", lambda cadata: tls)
    client = gateway.GatewayClient("https://gateway.example/", "gateway-ca", "client-identity")
    request_content = content()

    # Act
    response = await client.request(
        application_id=application_id,
        user_id=user_id,
        method="POST",
        path="health",
        query="verbose=true",
        content_type="application/json",
        content=request_content,
    )

    # Assert
    client_kwargs = cast(dict[str, object], captured["client_kwargs"])
    request = cast(dict[str, object], captured["request"])
    send = cast(dict[str, object], captured["send"])
    assert client_kwargs == {"follow_redirects": False, "timeout": 300.0, "verify": tls}
    assert request == {
        "method": "POST",
        "url": "https://gateway.example/health?verbose=true",
        "content": request_content,
        "headers": {
            "x-longlink-application-id": str(application_id),
            "x-user-id": str(user_id),
            "content-type": "application/json",
        },
    }
    assert send["stream"] is True
    assert "response_closed" not in captured
    assert "client_closed" not in captured

    await response.aclose()

    assert captured["response_closed"] is True
    assert captured["client_closed"] is True
