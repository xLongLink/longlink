from src.utils import images
from src.models.metadata import LongLinkMetadata


def test_inspect_image_returns_longlink_metadata(clients, monkeypatch) -> None:
    """Return name, description, and environment metadata for an image."""

    # Arrange
    async def fake_metadata(image: str) -> LongLinkMetadata:
        return LongLinkMetadata(
            title="dashboard",
            description="Demo app",
            version="20250623_120000",
            sdk="0.1.0",
            digest="sha256:manifest",
            environments=[
                {
                    "name": "API_KEY",
                    "type": "str",
                    "description": "API key used by Longlink",
                    "required": True,
                },
                {
                    "name": "PORT",
                    "type": "int",
                    "description": "HTTP listen port",
                    "required": False,
                },
            ],
        )

    monkeypatch.setattr("src.routes.image.images.metadata", fake_metadata)
    client = clients[0]

    # Act
    response = client.get("/api/image?image=ghcr.io/longlink/dashboard:latest")

    # Assert
    assert response.status_code == 200
    payload = response.json()
    expected_data = LongLinkMetadata.model_validate(payload).model_dump(mode="json")
    assert payload == expected_data
    assert payload == {
        "sdk": "0.1.0",
        "title": "dashboard",
        "version": "20250623_120000",
        "description": "Demo app",
        "digest": "sha256:manifest",
        "environments": [
            {
                "name": "API_KEY",
                "type": "str",
                "description": "API key used by Longlink",
                "required": True,
            },
            {
                "name": "PORT",
                "type": "int",
                "description": "HTTP listen port",
                "required": False,
            }
        ],
    }


def test_inspect_image_returns_empty_metadata_when_labels_missing(clients, monkeypatch) -> None:
    """Return an empty inspection payload when the image has no LongLink labels."""

    # Arrange
    async def fake_metadata(image: str) -> LongLinkMetadata:
        return LongLinkMetadata()

    monkeypatch.setattr("src.routes.image.images.metadata", fake_metadata)
    client = clients[0]

    # Act
    response = client.get("/api/image?image=ghcr.io/longlink/dashboard:latest")

    # Assert
    assert response.status_code == 200
    assert response.json() == {
        "sdk": None,
        "title": None,
        "version": None,
        "description": None,
        "digest": None,
        "environments": [],
    }


def test_inspect_image_returns_404_when_metadata_missing(clients, monkeypatch) -> None:
    """Return a not-found error when the image has no LongLink metadata."""

    # Arrange
    async def fake_metadata(image: str) -> None:
        return None

    monkeypatch.setattr("src.routes.image.images.metadata", fake_metadata)
    client = clients[0]

    # Act
    response = client.get("/api/image?image=ghcr.io/longlink/dashboard:latest")

    # Assert
    assert response.status_code == 404
    assert response.json() == {"detail": "Image metadata 'ghcr.io/longlink/dashboard:latest' not found"}


async def test_metadata_rejects_local_registry_hosts() -> None:
    """Avoid inspecting image metadata through localhost registry references."""

    # Arrange

    # Act
    image_metadata = await images.metadata("localhost:5000/longlink/dashboard:latest")

    # Assert
    assert image_metadata is None


async def test_metadata_allows_configured_development_local_registry(monkeypatch) -> None:
    """Inspect image metadata through the configured local development registry."""

    # Arrange
    captured: dict[str, object] = {}
    monkeypatch.setattr(images.env, "DEVELOPMENT", True)
    monkeypatch.setattr(images.env, "LOCAL_CONTAINER_REGISTRY", "localhost:15000")

    async def fake_validate_public_host(hostname: str) -> None:
        """Fail if local development inspection uses public host validation."""

        raise AssertionError(f"Unexpected public host validation for {hostname}")

    async def fake_fetch_manifest(client: object, registry_url: str, repository: str, tag: str) -> tuple[dict[str, object], str]:
        """Capture the manifest request and return a minimal OCI manifest."""

        captured["manifest"] = {
            "registry_url": registry_url,
            "repository": repository,
            "tag": tag,
        }
        return {"config": {"digest": "sha256:config"}}, "sha256:manifest"

    async def fake_fetch_blob(client: object, registry_url: str, repository: str, digest: str) -> dict[str, object]:
        """Capture the blob request and return LongLink labels."""

        captured["blob"] = {
            "registry_url": registry_url,
            "repository": repository,
            "digest": digest,
        }
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

    monkeypatch.setattr(images, "_validate_public_host", fake_validate_public_host)
    monkeypatch.setattr(images, "_fetch_manifest", fake_fetch_manifest)
    monkeypatch.setattr(images, "_fetch_blob", fake_fetch_blob)

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
    assert captured["manifest"] == {
        "registry_url": "http://localhost:15000",
        "repository": "longlink/dashboard",
        "tag": "dev",
    }
    assert captured["blob"] == {
        "registry_url": "http://localhost:15000",
        "repository": "longlink/dashboard",
        "digest": "sha256:config",
    }


async def test_metadata_fetches_digest_image_references(monkeypatch) -> None:
    """Inspect image metadata when the image reference is pinned by digest."""

    # Arrange
    captured: dict[str, object] = {}

    async def fake_validate_public_host(hostname: str) -> None:
        """Capture public host validation without resolving DNS in the unit test."""

        captured["hostname"] = hostname

    async def fake_fetch_manifest(client: object, registry_url: str, repository: str, tag: str) -> tuple[dict[str, object], str]:
        """Capture the manifest reference and return a minimal OCI manifest."""

        captured["manifest"] = {
            "registry_url": registry_url,
            "repository": repository,
            "tag": tag,
        }
        return {"config": {"digest": "sha256:config"}}, "sha256:deadbeef"

    async def fake_fetch_blob(client: object, registry_url: str, repository: str, digest: str) -> dict[str, object]:
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

    monkeypatch.setattr(images, "_validate_public_host", fake_validate_public_host)
    monkeypatch.setattr(images, "_fetch_manifest", fake_fetch_manifest)
    monkeypatch.setattr(images, "_fetch_blob", fake_fetch_blob)

    # Act
    image_metadata = await images.metadata("ghcr.io/longlink/dashboard@sha256:deadbeef")

    # Assert
    assert image_metadata is not None
    assert image_metadata.version == "sha256-deadbeef"
    assert image_metadata.digest == "sha256:deadbeef"
    assert captured["hostname"] == "ghcr.io"
    assert captured["manifest"] == {
        "registry_url": "https://ghcr.io",
        "repository": "longlink/dashboard",
        "tag": "sha256:deadbeef",
    }


async def test_bearer_token_resolution_parses_quoted_auth_params(monkeypatch) -> None:
    """Parse quoted WWW-Authenticate values without splitting inside quoted commas."""

    # Arrange
    captured: dict[str, object] = {}

    class FakeResponse:
        headers = {
            "www-authenticate": 'Bearer realm="https://auth.example/token",service="registry.example",scope="repository:team/app:pull,push"'
        }

    class FakeTokenResponse:
        is_success = True

        def json(self) -> dict[str, str]:
            return {"token": "registry-token"}

    class FakeClient:
        async def get(self, url: str, params: dict[str, str]) -> FakeTokenResponse:
            captured["url"] = url
            captured["params"] = params
            return FakeTokenResponse()

    async def fake_validate_public_host(hostname: str) -> None:
        captured["hostname"] = hostname

    monkeypatch.setattr(images, "_validate_public_host", fake_validate_public_host)

    # Act
    token = await images._resolve_bearer_token(FakeClient(), "team/app", FakeResponse())

    # Assert
    assert token == "registry-token"
    assert captured == {
        "hostname": "auth.example",
        "url": "https://auth.example/token",
        "params": {
            "service": "registry.example",
            "scope": "repository:team/app:pull,push",
        },
    }
