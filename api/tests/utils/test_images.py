import httpx2
import pytest
from src.utils import images
from collections.abc import Callable, AsyncIterator
from src.models.types import Image
from src.models.metadata import LongLinkMetadata, EnvironmentMetadata

pytestmark = pytest.mark.no_db


def mock_async_client(monkeypatch: pytest.MonkeyPatch, respond: Callable[[httpx2.Request], httpx2.Response]) -> None:
    """Patch image HTTP requests to use a deterministic registry transport."""

    async_client = httpx2.AsyncClient

    def client(*args: object, **kwargs: object) -> httpx2.AsyncClient:
        """Build an HTTP client backed by the supplied registry transport."""

        return async_client(*args, transport=httpx2.MockTransport(respond), **kwargs)

    monkeypatch.setattr(images.httpx2, "AsyncClient", client)


async def test_metadata_rejects_unsupported_registry_hosts() -> None:
    """Avoid inspecting image metadata through unsupported registry references."""

    # Act
    assert await images.metadata(Image("registry.example.com/longlink/dashboard:latest")) is None


@pytest.mark.parametrize(
    "manifest_headers",
    [
        pytest.param({"Docker-Content-Digest": "sha256:deadbeef"}, id="digest-header"),
        pytest.param({}, id="digest-reference-fallback"),
    ],
)
async def test_metadata_fetches_digest_image_references(
    monkeypatch: pytest.MonkeyPatch,
    manifest_headers: dict[str, str],
) -> None:
    """Inspect public GHCR digest-pinned image references."""

    # Arrange
    image = "ghcr.io/longlink/dashboard@sha256:deadbeef"
    captured: dict[str, object] = {}

    def respond(request: httpx2.Request) -> httpx2.Response:
        """Capture GHCR requests and return the matching public image resource."""

        if request.url.path == "/token":
            captured["token"] = {"url": str(request.url)}
            return httpx2.Response(200, json={"token": "pull-token"})
        if "/manifests/" in request.url.path:
            captured["manifest"] = {
                "url": str(request.url),
                "accept": request.headers["Accept"],
                "authorization": request.headers["Authorization"],
            }
            return httpx2.Response(
                200,
                json={"config": {"digest": "sha256:config"}},
                headers=manifest_headers,
            )
        captured["blob"] = {"url": str(request.url), "authorization": request.headers["Authorization"]}
        return httpx2.Response(
            200,
            json={
                "config": {
                    "Labels": {
                        "org.opencontainers.image.description": "Demo app",
                        "longlink.environments": '[{"name":"API_KEY","required":true}]',
                    }
                }
            },
        )

    mock_async_client(monkeypatch, respond)

    # Act
    image_metadata = await images.metadata(Image(image))

    # Assert
    assert image_metadata is not None
    assert image_metadata.model_dump(mode="json") == LongLinkMetadata(
        image=Image(image),
        description="Demo app",
        environments=[EnvironmentMetadata(name="API_KEY", required=True)],
    ).model_dump(mode="json")
    assert captured == {
        "token": {
            "url": "https://ghcr.io/token?service=ghcr.io&scope=repository%3Alonglink%2Fdashboard%3Apull",
        },
        "manifest": {
            "url": "https://ghcr.io/v2/longlink/dashboard/manifests/sha256:deadbeef",
            "accept": "application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json",
            "authorization": "Bearer pull-token",
        },
        "blob": {
            "url": "https://ghcr.io/v2/longlink/dashboard/blobs/sha256:config",
            "authorization": "Bearer pull-token",
        },
    }


async def test_metadata_rejects_tag_without_registry_digest(monkeypatch: pytest.MonkeyPatch) -> None:
    """Reject mutable image tags when GHCR omits the resolved manifest digest."""

    # Arrange
    def respond(request: httpx2.Request) -> httpx2.Response:
        """Return a manifest without a digest while forbidding blob inspection."""

        if request.url.path == "/token":
            return httpx2.Response(200, json={"token": "pull-token"})
        if "/manifests/" in request.url.path:
            return httpx2.Response(200, json={"config": {"digest": "sha256:config"}})
        raise AssertionError("Mutable images must not fetch config blobs")

    mock_async_client(monkeypatch, respond)

    # Act
    image_metadata = await images.metadata(Image("ghcr.io/longlink/dashboard:latest"))

    # Assert
    assert image_metadata is None


@pytest.mark.parametrize(
    "headers",
    [
        pytest.param({"Content-Length": str(images.IMAGE_METADATA_MAX_BYTES + 1)}, id="declared-oversize"),
        pytest.param({"Content-Length": "invalid"}, id="invalid-content-length"),
    ],
)
async def test_metadata_rejects_invalid_manifest_response_sizes(
    monkeypatch: pytest.MonkeyPatch, headers: dict[str, str]
) -> None:
    """Reject oversized or invalid manifest bodies before decoding them."""

    # Arrange
    def respond(request: httpx2.Request) -> httpx2.Response:
        """Return authentication followed by an invalidly sized manifest."""
        if request.url.path == "/token":
            return httpx2.Response(200, json={"token": "pull-token"})
        return httpx2.Response(200, content=b"{}", headers=headers)

    mock_async_client(monkeypatch, respond)

    # Act and assert
    assert await images.metadata(Image("ghcr.io/longlink/dashboard:latest")) is None


async def test_bounded_json_rejects_streamed_metadata_larger_than_limit() -> None:
    """Reject metadata that exceeds the limit without a declared content length."""

    # Arrange
    class OversizedStream(httpx2.AsyncByteStream):
        """Yield metadata exceeding the configured in-memory boundary."""

        async def __aiter__(self) -> AsyncIterator[bytes]:
            """Yield one oversized metadata chunk."""

            yield b"x" * (images.IMAGE_METADATA_MAX_BYTES + 1)

        async def aclose(self) -> None:
            """Close the in-memory stream."""

    response = httpx2.Response(200, stream=OversizedStream())

    # Act
    payload = await images.bounded_json(response)

    # Assert
    assert payload is None


@pytest.mark.parametrize(
    ("responses", "expected_paths"),
    [
        pytest.param([httpx2.Response(503)], ["/token"], id="failed-token"),
        pytest.param([httpx2.Response(200, json=[])], ["/token"], id="invalid-token"),
        pytest.param(
            [httpx2.Response(200, json={"token": "pull-token"}), httpx2.Response(503)],
            ["/token", "/v2/longlink/dashboard/manifests/latest"],
            id="failed-manifest",
        ),
        pytest.param(
            [
                httpx2.Response(200, json={"token": "pull-token"}),
                httpx2.Response(
                    200,
                    json={"config": {"digest": "invalid"}},
                    headers={"Docker-Content-Digest": "sha256:deadbeef"},
                ),
            ],
            ["/token", "/v2/longlink/dashboard/manifests/latest"],
            id="invalid-config",
        ),
    ],
)
async def test_metadata_stops_when_registry_responses_are_invalid(
    monkeypatch: pytest.MonkeyPatch, responses: list[httpx2.Response], expected_paths: list[str]
) -> None:
    """Return no metadata without requesting later registry resources after invalid responses."""

    # Arrange
    requested_paths: list[str] = []

    def respond(request: httpx2.Request) -> httpx2.Response:
        """Return the configured invalid registry response."""

        requested_paths.append(request.url.path)
        return responses.pop(0)

    mock_async_client(monkeypatch, respond)

    # Act
    image_metadata = await images.metadata(Image("ghcr.io/longlink/dashboard:latest"))

    # Assert
    assert image_metadata is None
    assert requested_paths == expected_paths


async def test_metadata_resolves_tag_to_registry_digest(monkeypatch: pytest.MonkeyPatch) -> None:
    """Return immutable metadata when the registry resolves a mutable tag."""

    # Arrange
    resolved_digest = "sha256:deadbeef"

    def respond(request: httpx2.Request) -> httpx2.Response:
        """Return a resolved manifest and its LongLink metadata config."""

        if request.url.path == "/token":
            return httpx2.Response(200, json={"token": "pull-token"})
        if "/manifests/" in request.url.path:
            return httpx2.Response(
                200,
                json={"config": {"digest": "sha256:config"}},
                headers={"Docker-Content-Digest": resolved_digest},
            )
        return httpx2.Response(200, json={"config": {"Labels": {}}})

    mock_async_client(monkeypatch, respond)

    # Act
    image_metadata = await images.metadata(Image("ghcr.io/longlink/dashboard:latest"))

    # Assert
    assert image_metadata is not None
    assert image_metadata.image == Image(f"ghcr.io/longlink/dashboard@{resolved_digest}")


@pytest.mark.parametrize(
    "config_blob",
    [
        pytest.param([], id="invalid-config-blob"),
        pytest.param({"config": []}, id="invalid-image-config"),
        pytest.param({"config": {"Labels": []}}, id="invalid-labels"),
        pytest.param({"config": {"Labels": {"org.opencontainers.image.description": 1}}}, id="invalid-label-value"),
        pytest.param({"config": {"Labels": {"longlink.environments": "not-json"}}}, id="invalid-environments-json"),
        pytest.param({"config": {"Labels": {"longlink.environments": "{}"}}}, id="invalid-environments-shape"),
        pytest.param(
            {"config": {"Labels": {"longlink.environments": '[{"name":"API_KEY","required":[]}]'}}},
            id="invalid-environment-entry",
        ),
    ],
)
async def test_metadata_rejects_malformed_config_metadata(
    monkeypatch: pytest.MonkeyPatch, config_blob: object
) -> None:
    """Return no metadata when valid registry responses contain malformed config metadata."""

    # Arrange
    requested_paths: list[str] = []

    def respond(request: httpx2.Request) -> httpx2.Response:
        """Return valid authentication and manifest resources before malformed config data."""

        requested_paths.append(request.url.path)
        if request.url.path == "/token":
            return httpx2.Response(200, json={"token": "pull-token"})
        if "/manifests/" in request.url.path:
            assert request.headers["Authorization"] == "Bearer pull-token"
            return httpx2.Response(
                200,
                json={"config": {"digest": "sha256:config"}},
                headers={"Docker-Content-Digest": "sha256:deadbeef"},
            )
        assert request.headers["Authorization"] == "Bearer pull-token"
        return httpx2.Response(200, json=config_blob)

    mock_async_client(monkeypatch, respond)

    # Act
    image_metadata = await images.metadata(Image("ghcr.io/longlink/dashboard:latest"))

    # Assert
    assert image_metadata is None
    assert requested_paths == ["/token", "/v2/longlink/dashboard/manifests/latest", "/v2/longlink/dashboard/blobs/sha256:config"]


@pytest.mark.parametrize(
    ("envs", "expected_missing"),
    [
        pytest.param({}, ["API_KEY"], id="missing"),
        pytest.param({"API_KEY": " "}, ["API_KEY"], id="blank"),
        pytest.param({"API_KEY": "configured"}, [], id="configured"),
    ],
)
def test_missing_envs_returns_required_unconfigured_values(envs: dict[str, str], expected_missing: list[str]) -> None:
    """Return required environment names whose supplied values are blank or absent."""

    # Arrange
    metadata = LongLinkMetadata(
        image=Image("ghcr.io/longlink/dashboard:latest"),
        environments=[EnvironmentMetadata(name="API_KEY", required=True)],
    )

    # Act
    missing = images.missing_envs(metadata, envs)

    # Assert
    assert missing == expected_missing


def test_missing_envs_rejects_user_values_for_reserved_runtime_names() -> None:
    """Keep Platform-owned runtime requirements unavailable to user input."""

    # Arrange
    metadata = LongLinkMetadata(
        image=Image("ghcr.io/longlink/dashboard:latest"),
        environments=[EnvironmentMetadata(name="LONGLINK_DATABASE_PASSWORD", required=True)],
    )

    # Act
    missing = images.missing_envs(metadata, {"LONGLINK_DATABASE_PASSWORD": "configured"})

    # Assert
    assert missing == ["LONGLINK_DATABASE_PASSWORD"]
