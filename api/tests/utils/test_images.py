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
    version = "sha256-deadbeef"
    manifest_digest = "sha256:deadbeef"
    captured: dict[str, object] = {}

    class FakeResponse:
        """Return a successful image config response."""

        is_success = True

        def __init__(self, payload: dict[str, object], headers: dict[str, str] | None = None) -> None:
            """Store the response payload and headers."""

            self._payload = payload
            self.headers = {} if headers is None else headers

        def json(self) -> dict[str, object]:
            """Return LongLink labels from the image config blob."""

            return self._payload

    class FakeAsyncClient:
        """Capture config blob requests from the image metadata reader."""

        def __init__(self, *_args: object, **_kwargs: object) -> None:
            """Accept the real async client constructor shape."""

        async def __aenter__(self) -> "FakeAsyncClient":
            """Return the fake registry client."""

            return self

        async def __aexit__(self, *_args: object) -> None:
            """Close the fake registry client."""

        async def get(self, url: str, headers: dict[str, str] | None = None) -> FakeResponse:
            """Capture the config blob request and return image labels."""

            if "/manifests/" in url:
                captured["manifest"] = {"url": url, "headers": headers}
                return FakeResponse(
                    {"config": {"digest": "sha256:config"}},
                    {"Docker-Content-Digest": manifest_digest},
                )
            captured["blob"] = {"url": url, "headers": headers}
            return FakeResponse(
                {
                    "config": {
                        "Labels": {
                            "org.opencontainers.image.title": "dashboard",
                            "org.opencontainers.image.version": version,
                            "org.opencontainers.image.description": "Demo app",
                            "longlink.environments": '[{"name":"API_KEY","type":"string","required":true}]',
                        }
                    }
                }
            )

    monkeypatch.setattr(images.httpx2, "AsyncClient", FakeAsyncClient)

    # Act
    image_metadata = await images.metadata(Image(image))

    # Assert
    assert image_metadata is not None
    assert image_metadata.model_dump(mode="json") == LongLinkMetadata(
        image=image,
        title="dashboard",
        version=version,
        description="Demo app",
        digest=manifest_digest,
        environments=[EnvironmentMetadata(name="API_KEY", type="string", required=True)],
    ).model_dump(mode="json")
    assert images.missing_envs(image_metadata, {}) == ["API_KEY"]
    assert images.missing_envs(image_metadata, {"API_KEY": " "}) == ["API_KEY"]
    assert images.missing_envs(image_metadata, {"API_KEY": "configured"}) == []
    assert captured == {
        "manifest": {
            "url": "https://ghcr.io/v2/longlink/dashboard/manifests/sha256:deadbeef",
            "headers": {"Accept": "application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json"},
        },
        "blob": {
            "url": "https://ghcr.io/v2/longlink/dashboard/blobs/sha256:config",
            "headers": None,
        },
    }
