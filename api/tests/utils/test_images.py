import httpx2
import pytest
from src.utils import images
from src.models.types import Image
from src.models.metadata import LongLinkMetadata, EnvironmentMetadata

pytestmark = pytest.mark.no_db


async def test_metadata_rejects_unsupported_registry_hosts() -> None:
    """Avoid inspecting image metadata through unsupported registry references."""

    # Act
    assert await images.metadata(Image("registry.example.com/longlink/dashboard:latest")) is None


async def test_metadata_fetches_digest_image_references(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Inspect public GHCR digest-pinned image references."""

    # Arrange
    image = "ghcr.io/longlink/dashboard@sha256:deadbeef"
    manifest_digest = "sha256:deadbeef"
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
                headers={"Docker-Content-Digest": manifest_digest},
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

    async_client = httpx2.AsyncClient

    def client(*args: object, **kwargs: object) -> httpx2.AsyncClient:
        """Build an HTTP client backed by the deterministic registry transport."""

        return async_client(*args, transport=httpx2.MockTransport(respond), **kwargs)

    monkeypatch.setattr(images.httpx2, "AsyncClient", client)

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
