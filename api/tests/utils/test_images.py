import pytest
from src.utils import images
from src.models.images import Image
from src.models.metadata import LongLinkMetadata


async def test_metadata_rejects_unsupported_registry_hosts() -> None:
    """Avoid inspecting image metadata through unsupported registry references."""

    # Act
    image_metadata = await images.metadata(Image("registry.example.com/longlink/dashboard:latest"))

    # Assert
    assert image_metadata is None


@pytest.mark.parametrize(
    ("image", "development", "version", "manifest_digest", "registry_url", "manifest_reference", "expected_image"),
    [
        pytest.param(
            "localhost:15000/longlink/dashboard:dev",
            True,
            "dev",
            "sha256:manifest",
            "http://localhost:15000",
            "dev",
            "localhost:15000/longlink/dashboard@sha256:manifest",
            id="development-tag",
        ),
        pytest.param(
            "ghcr.io/longlink/dashboard@sha256:deadbeef",
            False,
            "sha256-deadbeef",
            "sha256:deadbeef",
            "https://ghcr.io",
            "sha256:deadbeef",
            "ghcr.io/longlink/dashboard@sha256:deadbeef",
            id="digest",
        ),
    ],
)
async def test_metadata_fetches_tagged_and_digest_image_references(
    monkeypatch: pytest.MonkeyPatch,
    image: str,
    development: bool,
    version: str,
    manifest_digest: str,
    registry_url: str,
    manifest_reference: str,
    expected_image: str,
) -> None:
    """Inspect supported tagged and digest-pinned image references."""

    # Arrange
    captured: dict[str, object] = {}
    monkeypatch.setattr(images.env, "DEVELOPMENT", development)

    async def fake_fetch_manifest(
        _client: object, registry_url: str, repository: str, reference: str
    ) -> tuple[dict[str, object], str]:
        """Capture the manifest request and return a minimal OCI manifest."""

        captured["manifest"] = {
            "registry_url": registry_url,
            "repository": repository,
            "reference": reference,
        }
        return {"config": {"digest": "sha256:config"}}, manifest_digest

    class FakeConfigResponse:
        """Return a successful image config response."""

        is_success = True

        def json(self) -> dict[str, object]:
            """Return LongLink labels from the image config blob."""

            return {
                "config": {
                    "Labels": {
                        "longlink.name": "dashboard",
                        "longlink.sdk": "0.1.0",
                        "longlink.version": version,
                        "longlink.description": "Demo app",
                    }
                }
            }

    class FakeAsyncClient:
        """Capture config blob requests from the image metadata reader."""

        def __init__(self, *_args: object, **_kwargs: object) -> None:
            """Accept the real async client constructor shape."""

        async def __aenter__(self) -> FakeAsyncClient:
            """Return the fake registry client."""

            return self

        async def __aexit__(self, *_args: object) -> None:
            """Close the fake registry client."""

        async def get(self, url: str, headers: dict[str, str] | None = None) -> FakeConfigResponse:
            """Capture the config blob request and return image labels."""

            captured["blob"] = {"url": url, "headers": headers}
            return FakeConfigResponse()

    monkeypatch.setattr(images, "_fetch_manifest", fake_fetch_manifest)
    monkeypatch.setattr(images.httpx2, "AsyncClient", FakeAsyncClient)

    # Act
    image_metadata = await images.metadata(Image(image))

    # Assert
    assert image_metadata is not None
    assert image_metadata.model_dump(mode="json") == LongLinkMetadata(
        sdk="0.1.0",
        title="dashboard",
        version=version,
        description="Demo app",
        digest=manifest_digest,
    ).model_dump(mode="json")
    assert image_metadata.image == expected_image
    assert captured == {
        "manifest": {
            "registry_url": registry_url,
            "repository": "longlink/dashboard",
            "reference": manifest_reference,
        },
        "blob": {
            "url": f"{registry_url}/v2/longlink/dashboard/blobs/sha256:config",
            "headers": None,
        },
    }
