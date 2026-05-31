import httpx
from fastapi.testclient import TestClient

import src.db as db
from src.db.models import User, UserApp
from src.db.session import get_session
from src.models import AppResponse, ComputeKind, UserSummary
from src.models.roles import Roles


async def test_list_apps_returns_app_membership_role(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Return the app-specific role instead of the organization role."""

    # Arrange
    user = users[0]
    await db.orgs.create("acme", user)
    app = await db.apps.create(
        "acme",
        "dashboard",
        url="/api/apps/dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=user,
    )

    Session = await get_session()
    async with Session() as session:
        session.add(
            UserApp(
                user_id=user.id,
                organization_name="acme",
                app_name="dashboard",
                role_name=Roles.write,
            )
        )
        await session.commit()

    client = clients[0]

    # Act
    response = client.get("/api/apps?organization=acme")

    # Assert
    assert response.status_code == 200
    expected_data = AppResponse.model_validate(
        {
            **app.model_dump(),
            "role": Roles.write,
            "created_by": UserSummary.model_validate(user.model_dump()),
            "updated_by": UserSummary.model_validate(user.model_dump()),
            "deleted_by": None,
        }
    ).model_dump(mode="json")
    assert response.json() == [expected_data]


async def test_list_apps_returns_null_role_without_app_membership(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Return no app role when the user has no app membership row."""

    # Arrange
    user = users[0]
    await db.orgs.create("acme", user)
    app = await db.apps.create(
        "acme",
        "dashboard",
        url="/api/apps/dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=user,
    )
    client = clients[0]

    # Act
    response = client.get("/api/apps?organization=acme")

    # Assert
    assert response.status_code == 200
    expected_data = AppResponse.model_validate(
        {
            **app.model_dump(),
            "role": None,
            "created_by": UserSummary.model_validate(user.model_dump()),
            "updated_by": UserSummary.model_validate(user.model_dump()),
            "deleted_by": None,
        }
    ).model_dump(mode="json")
    assert response.json() == [expected_data]


async def test_list_apps_returns_404_for_non_member(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject app listing when the user does not belong to the organization."""

    # Arrange
    owner = users[0]
    await db.orgs.create("acme", owner)
    await db.apps.create("acme", "dashboard", url="/api/apps/dashboard", image="ghcr.io/longlink/dashboard:latest")
    client = clients[1]

    # Act
    response = client.get("/api/apps?organization=acme")

    # Assert
    assert response.status_code == 404
    assert response.json() == {
        "success": False,
        "detail": "Org 'acme' not found",
        "data": None,
    }


async def test_create_app_returns_app_response(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Create an app and return the app response payload."""

    # Arrange
    user = users[0]
    await db.orgs.create("acme", user)
    client = clients[0]

    # Act
    response = client.post(
        "/api/apps?organization=acme",
        json={"name": "dashboard", "image": "ghcr.io/longlink/dashboard:latest"},
    )

    # Assert
    assert response.status_code == 200
    payload = response.json()
    expected_data = AppResponse.model_validate(payload).model_dump(mode="json")
    assert payload["deleted_by"] is None
    assert payload == expected_data


async def test_delete_app_removes_dependent_env_rows(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Delete an app even when it still has env secrets."""

    # Arrange
    user = users[0]
    await db.orgs.create("acme", user)
    app = await db.apps.create("acme", "dashboard", url="/api/apps/dashboard", image="ghcr.io/longlink/dashboard:latest")
    await db.envs.set("TOKEN", "secret", "dashboard")
    client = clients[0]

    # Act
    response = client.delete(f"/api/apps/{app.id}?organization=acme")

    # Assert
    assert response.status_code == 204
    assert await db.apps.get("acme", "dashboard") is None
    assert await db.envs.get("TOKEN", "dashboard") is None


async def test_proxy_app_forwards_request_to_internal_service(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
    monkeypatch,
) -> None:
    """Proxy an app request into the internal service."""

    # Arrange
    user = users[0]
    await db.orgs.create("acme", user)
    app = await db.apps.create("acme", "dashboard", url="/api/apps/dashboard", image="ghcr.io/xlonglink/sample:latest")
    await db.compute.create(
        kind=ComputeKind.kubernetes,
        kubeconfig=(
            "apiVersion: v1\n"
            "clusters:\n"
            "- name: k3d-compute\n"
            "  cluster:\n"
            "    server: https://0.0.0.0:8001\n"
            "contexts:\n"
            "- name: k3d-compute\n"
            "  context:\n"
            "    cluster: k3d-compute\n"
            "    user: admin@k3d-compute\n"
            "current-context: k3d-compute\n"
            "kind: Config\n"
            "preferences: {}\n"
            "users:\n"
            "- name: admin@k3d-compute\n"
            "  user:\n"
            "    client-certificate-data: Y2VydA==\n"
            "    client-key-data: a2V5\n"
        ),
        ingress_host="localhost:8443",
        ingress_name="control-ingress",
    )
    client = clients[0]
    captured: dict[str, object] = {}

    class FakeAsyncClient:
        def __init__(self, *, base_url, verify):
            captured["base_url"] = base_url
            captured["verify"] = verify

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def request(self, method, url, **kwargs):
            captured["method"] = method
            captured["resource_path"] = url
            captured["query_params"] = kwargs.get("params")
            captured["headers"] = kwargs.get("headers")
            captured["body"] = kwargs.get("content")
            return httpx.Response(200, content=b"proxied", headers={"content-type": "text/plain"})

    monkeypatch.setattr(httpx, "AsyncClient", FakeAsyncClient)

    # Act
    response = client.post(f"/api/apps/{app.id}/proxy/anything?answer=42", content=b"hello")

    # Assert
    assert response.status_code == 200
    assert response.text == "proxied"
    assert captured["method"] == "POST"
    assert captured["resource_path"] == "/api/v1/namespaces/acme/services/dashboard:80/proxy/anything"
    assert captured["query_params"] == [("answer", "42")]
    assert captured["body"] == b"hello"
    assert captured["base_url"] == "https://localhost:8443"
    assert captured["verify"] is False
