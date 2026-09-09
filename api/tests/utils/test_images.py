import httpx2
import pytest
from src.utils import images
from src.errors import ForbiddenError
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
    with pytest.raises(ForbiddenError, match="not allowed"):
        await images.metadata(Image("registry.example.com/longlink/dashboard:latest"))


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
    expected_metadata = LongLinkMetadata(
        image=Image(image),
        description="Demo app",
        environments=[EnvironmentMetadata(name="API_KEY", required=True)],
    )
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
    assert image_metadata == expected_metadata
    assert captured == {
        "token": {
            "url": "https://ghcr.io/token?service=ghcr.io&scope=repository%3Alonglink%2Fdashboard%3Apull",
        },
        "manifest": {
            "url": "https://ghcr.io/v2/longlink/dashboard/manifests/sha256:deadbeef",
            "accept": images.MANIFEST_ACCEPT,
            "authorization": "Bearer pull-token",
        },
        "blob": {
            "url": "https://ghcr.io/v2/longlink/dashboard/blobs/sha256:config",
            "authorization": "Bearer pull-token",
        },
    }


async def test_metadata_follows_config_blob_redirects(monkeypatch: pytest.MonkeyPatch) -> None:
    """Read image configuration after GHCR redirects the blob request."""

    # Arrange
    def respond(request: httpx2.Request) -> httpx2.Response:
        """Return a GHCR metadata sequence with a redirected config blob."""

        if request.url.path == "/token":
            return httpx2.Response(200, json={"token": "pull-token"})
        if "/manifests/" in request.url.path:
            return httpx2.Response(
                200,
                json={"config": {"digest": "sha256:config"}},
                headers={"Docker-Content-Digest": "sha256:deadbeef"},
            )
        if request.url.host == "ghcr.io":
            assert request.headers["Authorization"] == "Bearer pull-token"
            return httpx2.Response(307, headers={"Location": "https://pkg-containers.githubusercontent.com/config"})
        assert request.url == "https://pkg-containers.githubusercontent.com/config"
        assert "Authorization" not in request.headers
        return httpx2.Response(200, json={"config": {"Labels": {}}})

    mock_async_client(monkeypatch, respond)

    # Act
    image_metadata = await images.metadata(Image("ghcr.io/longlink/dashboard:latest"))

    # Assert
    assert image_metadata is not None
    assert image_metadata.image == Image("ghcr.io/longlink/dashboard@sha256:deadbeef")


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
async def test_metadata_rejects_invalid_manifest_response_sizes(monkeypatch: pytest.MonkeyPatch, headers: dict[str, str]) -> None:
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

    # Assert
    assert await images.bounded_json(response) is None


@pytest.mark.parametrize(
    ("responses", "expected_paths"),
    [
        pytest.param([httpx2.Response(503)], ["/token"], id="failed-token"),
        pytest.param([httpx2.Response(200, json=[])], ["/token"], id="invalid-token"),
        pytest.param([httpx2.Response(200, json={"token": ""})], ["/token"], id="empty-token"),
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
        pytest.param(
            [
                httpx2.Response(200, json={"token": "pull-token"}),
                httpx2.Response(200, json={}, headers={"Docker-Content-Digest": "sha256:deadbeef"}),
            ],
            ["/token", "/v2/longlink/dashboard/manifests/latest"],
            id="missing-manifest-config",
        ),
        pytest.param(
            [
                httpx2.Response(200, json={"token": "pull-token"}),
                httpx2.Response(
                    200,
                    json={"config": {"digest": "sha256:config"}},
                    headers={"Docker-Content-Digest": "sha256:deadbeef"},
                ),
                httpx2.Response(503),
            ],
            ["/token", "/v2/longlink/dashboard/manifests/latest", "/v2/longlink/dashboard/blobs/sha256:config"],
            id="failed-config-blob",
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


async def test_metadata_accepts_config_without_labels(monkeypatch: pytest.MonkeyPatch) -> None:
    """Return digest metadata when an image config does not define labels."""

    # Arrange
    def respond(request: httpx2.Request) -> httpx2.Response:
        """Return a valid GHCR metadata sequence with unlabeled config data."""

        if request.url.path == "/token":
            return httpx2.Response(200, json={"token": "pull-token"})
        if "/manifests/" in request.url.path:
            return httpx2.Response(
                200,
                json={"config": {"digest": "sha256:config"}},
                headers={"Docker-Content-Digest": "sha256:deadbeef"},
            )
        return httpx2.Response(200, json={"config": {}})

    mock_async_client(monkeypatch, respond)

    # Act
    image_metadata = await images.metadata(Image("ghcr.io/longlink/dashboard:latest"))

    # Assert
    assert image_metadata is not None
    assert image_metadata.description is None
    assert image_metadata.environments == []


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
async def test_metadata_rejects_malformed_config_metadata(monkeypatch: pytest.MonkeyPatch, config_blob: object) -> None:
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


def test_missing_envs_sorts_reserved_and_unconfigured_requirements() -> None:
    """Return all required unavailable values in deterministic name order."""

    # Arrange
    metadata = LongLinkMetadata(
        image=Image("ghcr.io/longlink/dashboard:latest"),
        environments=[
            EnvironmentMetadata(name="ZEBRA", required=True),
            EnvironmentMetadata(name="LONGLINK_TOKEN", required=True),
            EnvironmentMetadata(name="ALPHA", required=False),
        ],
    )

    # Act
    missing = images.missing_envs(metadata, {"ZEBRA": "", "LONGLINK_TOKEN": "configured"})

    # Assert
    assert missing == ["LONGLINK_TOKEN", "ZEBRA"]


@pytest.mark.parametrize("registry", ["localhost:15001", "127.0.0.1:15000", "ghcr.io:443", "ghcr.io.evil", "GHCR.IO", "localhost:15000"])
async def test_registry_allowlist_is_exact_and_local_is_development_only(monkeypatch: pytest.MonkeyPatch, registry: str) -> None:
    """Reject alternate spellings and development registry access in production before networking."""

    monkeypatch.setattr(images.env, "DEVELOPMENT", False)
    with pytest.raises(ForbiddenError, match="not allowed"):
        await images.metadata(Image(f"{registry}/sample:dev"))


@pytest.mark.parametrize(
    "index_type", ["application/vnd.oci.image.index.v1+json", "application/vnd.docker.distribution.manifest.list.v2+json"]
)
async def test_local_registry_selects_amd64_child_without_authentication(monkeypatch: pytest.MonkeyPatch, index_type: str) -> None:
    """Inspect the selected child, not an index or a different architecture's metadata."""

    paths: list[str] = []

    def respond(request: httpx2.Request) -> httpx2.Response:
        """Serve an index containing an arm64 entry before the intended amd64 manifest."""

        assert request.url.scheme == "http" and request.url.host == "localhost" and request.url.port == 15000
        assert "Authorization" not in request.headers
        paths.append(request.url.path)
        if request.url.path.endswith("/dev"):
            return httpx2.Response(
                200,
                headers={"Docker-Content-Digest": "sha256:index"},
                json={
                    "mediaType": index_type,
                    "manifests": [
                        {"digest": "sha256:arm", "platform": {"os": "linux", "architecture": "arm64"}},
                        {"digest": "sha256:amd", "platform": {"os": "linux", "architecture": "amd64"}},
                    ],
                },
            )
        if request.url.path.endswith("/sha256:amd"):
            return httpx2.Response(200, json={"config": {"digest": "sha256:config"}})
        assert request.url.path.endswith("/blobs/sha256:config")
        return httpx2.Response(
            200,
            json={
                "os": "linux",
                "architecture": "amd64",
                "config": {"Labels": {"longlink.environments": '[{"name":"NEW","required":true}]'}},
            },
        )

    mock_async_client(monkeypatch, respond)
    result = await images.metadata(Image("localhost:15000/sample:dev"))
    assert result is not None and result.image == "localhost:15000/sample@sha256:amd"
    assert result.environments == [EnvironmentMetadata(name="NEW", required=True)]
    assert paths == ["/v2/sample/manifests/dev", "/v2/sample/manifests/sha256:amd", "/v2/sample/blobs/sha256:config"]


@pytest.mark.parametrize(
    "location",
    [
        "http://pkg-containers.githubusercontent.com/blob",
        "https://localhost/blob",
        "https://127.0.0.1/blob",
        "https://pkg-containers.githubusercontent.com.evil/blob",
        "https://pkg-containers.githubusercontent.com:444/blob",
        "https://user:password@pkg-containers.githubusercontent.com/blob",
        "//pkg-containers.githubusercontent.com/blob",
    ],
)
async def test_registry_rejects_arbitrary_blob_redirects(monkeypatch: pytest.MonkeyPatch, location: str) -> None:
    """Never follow redirects to arbitrary hosts, insecure transports, credentials, or ports."""

    def respond(request: httpx2.Request) -> httpx2.Response:
        """Return only resources on the allowed origin and reject any unexpected request."""

        assert request.url.host == "ghcr.io"
        if request.url.path == "/token":
            return httpx2.Response(200, json={"token": "public-pull"})
        if "/manifests/" in request.url.path:
            return httpx2.Response(200, headers={"Docker-Content-Digest": "sha256:manifest"}, json={"config": {"digest": "sha256:config"}})
        return httpx2.Response(307, headers={"Location": location})

    mock_async_client(monkeypatch, respond)
    assert await images.metadata(Image("ghcr.io/owner/sample:latest")) is None


@pytest.mark.parametrize("status", [401, 403])
async def test_registry_denial_is_explicit(monkeypatch: pytest.MonkeyPatch, status: int) -> None:
    """Distinguish denied anonymous registry access from absent metadata or an unchanged source."""

    mock_async_client(monkeypatch, lambda _request: httpx2.Response(status))
    with pytest.raises(ForbiddenError, match="denied anonymous"):
        await images.metadata(Image("ghcr.io/owner/private:latest"))


@pytest.mark.parametrize("children", [[], [{"digest": "sha256:arm", "platform": {"os": "linux", "architecture": "arm64"}}]])
async def test_registry_rejects_indexes_without_supported_platform(monkeypatch: pytest.MonkeyPatch, children: list[object]) -> None:
    """Require an explicit linux/amd64 child without guessing a fallback architecture."""

    mock_async_client(
        monkeypatch, lambda _request: httpx2.Response(200, headers={"Docker-Content-Digest": "sha256:index"}, json={"manifests": children})
    )
    assert await images.metadata(Image("localhost:15000/sample:dev")) is None
