from src.utils import images
from src.models.metadata import LongLinkMetadata


async def test_metadata_rejects_unsupported_registry_hosts() -> None:
    """Avoid inspecting image metadata through unsupported registry references."""

    # Act
    image_metadata = await images.metadata("registry.example.com/longlink/dashboard:latest")

    # Assert
    assert image_metadata is None


async def test_metadata_allows_development_local_registry(monkeypatch) -> None:
    """Inspect image metadata through a local development registry."""

    # Arrange
    captured: dict[str, object] = {}
    monkeypatch.setattr(images.env, "DEVELOPMENT", True)

    async def fake_fetch_manifest(
        client: object, registry_url: str, repository: str, tag: str
    ) -> tuple[dict[str, object], str]:
        """Capture the manifest request and return a minimal OCI manifest."""

        captured["manifest"] = {
            "registry_url": registry_url,
            "repository": repository,
            "tag": tag,
        }
        return {"config": {"digest": "sha256:config"}}, "sha256:manifest"

    class FakeConfigResponse:
        is_success = True

        def json(self) -> dict[str, object]:
            """Return LongLink labels from the image config blob."""

            return {
                "config": {
                    "Labels": {
                        "longlink.name": "dashboard",
                        "longlink.sdk": "0.1.0",
                        "longlink.version": "dev",
                        "longlink.description": "Demo app",
                    }
                }
            }

    class FakeAsyncClient:
        def __init__(self, *_args: object, **_kwargs: object) -> None:
            """Accept the same constructor shape as the real async client."""

        async def __aenter__(self) -> FakeAsyncClient:
            """Return the fake registry client."""

            return self

        async def __aexit__(self, *_args: object) -> None:
            """Close the fake registry client."""

        async def get(self, url: str, headers: dict[str, str] | None = None) -> FakeConfigResponse:
            """Capture the config blob request and return LongLink labels."""

            captured["blob"] = {
                "url": url,
                "headers": headers,
            }
            return FakeConfigResponse()

    monkeypatch.setattr(images, "_fetch_manifest", fake_fetch_manifest)
    monkeypatch.setattr(images.httpx2, "AsyncClient", FakeAsyncClient)

    # Act
    image_metadata = await images.metadata("localhost:15000/longlink/dashboard:dev")

    # Assert
    assert image_metadata is not None
    assert image_metadata.model_dump(mode="json") == LongLinkMetadata(
        sdk="0.1.0",
        title="dashboard",
        version="dev",
        description="Demo app",
        digest="sha256:manifest",
    ).model_dump(mode="json")
    assert image_metadata.image == "localhost:15000/longlink/dashboard@sha256:manifest"
    assert captured["manifest"] == {
        "registry_url": "http://localhost:15000",
        "repository": "longlink/dashboard",
        "tag": "dev",
    }
    assert captured["blob"] == {
        "url": "http://localhost:15000/v2/longlink/dashboard/blobs/sha256:config",
        "headers": None,
    }


async def test_metadata_fetches_digest_image_references(monkeypatch) -> None:
    """Inspect image metadata when the image reference is pinned by digest."""

    # Arrange
    captured: dict[str, object] = {}

    async def fake_fetch_manifest(
        client: object, registry_url: str, repository: str, tag: str
    ) -> tuple[dict[str, object], str]:
        """Capture the manifest reference and return a minimal OCI manifest."""

        captured["manifest"] = {
            "registry_url": registry_url,
            "repository": repository,
            "tag": tag,
        }
        return {"config": {"digest": "sha256:config"}}, "sha256:deadbeef"

    class FakeConfigResponse:
        is_success = True

        def json(self) -> dict[str, object]:
            """Return LongLink labels for the digest-pinned image config."""

            return {
                "config": {
                    "Labels": {
                        "longlink.name": "dashboard",
                        "longlink.sdk": "0.1.0",
                        "longlink.version": "sha256-deadbeef",
                        "longlink.description": "Demo app",
                    }
                }
            }

    class FakeAsyncClient:
        def __init__(self, *_args: object, **_kwargs: object) -> None:
            """Accept the same constructor shape as the real async client."""

        async def __aenter__(self) -> FakeAsyncClient:
            """Return the fake registry client."""

            return self

        async def __aexit__(self, *_args: object) -> None:
            """Close the fake registry client."""

        async def get(self, url: str, headers: dict[str, str] | None = None) -> FakeConfigResponse:
            """Return the digest-pinned image config blob."""

            return FakeConfigResponse()

    monkeypatch.setattr(images, "_fetch_manifest", fake_fetch_manifest)
    monkeypatch.setattr(images.httpx2, "AsyncClient", FakeAsyncClient)

    # Act
    image_metadata = await images.metadata("ghcr.io/longlink/dashboard@sha256:deadbeef")

    # Assert
    assert image_metadata is not None
    assert image_metadata.image == "ghcr.io/longlink/dashboard@sha256:deadbeef"
    assert image_metadata.version == "sha256-deadbeef"
    assert image_metadata.digest == "sha256:deadbeef"
    assert captured["manifest"] == {
        "registry_url": "https://ghcr.io",
        "repository": "longlink/dashboard",
        "tag": "sha256:deadbeef",
    }
