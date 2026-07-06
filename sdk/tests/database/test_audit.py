import pytest
from uuid import UUID
from fastapi import FastAPI
from longlink.database import base as database_base
from longlink.database import audit as database_audit
from fastapi.testclient import TestClient
from longlink.database.audit import audit_user_scope, install_audit_middleware


def test_audit_hook_applies_fields_and_converts_soft_deletes() -> None:
    """Fill create/update audit fields and convert hard deletes into soft deletes."""

    class AuditFeatureItem(database_base.Table):
        """Temporary SDK record used to verify audit mutation."""

    class FakeSession:
        """Minimal sync session surface used by the audit hook."""

        def __init__(self) -> None:
            """Create fake SQLAlchemy session collections."""

            self.new: list[object] = []
            self.dirty: list[object] = []
            self.deleted: list[object] = []
            self.added: list[object] = []

        def is_modified(self, obj: object, include_collections: bool = False) -> bool:
            """Treat all fake dirty objects as modified."""

            return obj in self.dirty

        def add(self, obj: object) -> None:
            """Capture objects re-added during soft delete conversion."""

            self.added.append(obj)

    user_id = UUID("00000000-0000-0000-0000-000000000002")
    new_item = AuditFeatureItem()
    dirty_item = AuditFeatureItem()
    deleted_item = AuditFeatureItem()
    new_item.created_at = None
    new_item.updated_at = None
    fake_session = FakeSession()
    fake_session.new = [new_item]
    fake_session.dirty = [dirty_item]
    fake_session.deleted = [deleted_item]

    with audit_user_scope(user_id):
        database_audit.apply_audit_fields(fake_session, None, None)

    assert new_item.created_at is not None
    assert new_item.updated_at is not None
    assert new_item.created_id == user_id
    assert new_item.updated_id == user_id
    assert dirty_item.updated_at is not None
    assert dirty_item.updated_id == user_id
    assert fake_session.added == [deleted_item]
    assert deleted_item.deleted_at is not None
    assert deleted_item.deleted_id == user_id
    assert deleted_item.updated_at is not None
    assert deleted_item.updated_id == user_id


@pytest.mark.parametrize(
    ("header_value", "expected_user_id"),
    [
        ("00000000-0000-0000-0000-000000000005", "00000000-0000-0000-0000-000000000005"),
        ("invalid", None),
    ],
)
def test_audit_middleware_binds_x_user_id_header(
    header_value: str,
    expected_user_id: str | None,
) -> None:
    """Bind valid audit user headers and ignore malformed values."""

    app = FastAPI()
    install_audit_middleware(app)

    @app.get("/")
    async def current_user() -> dict[str, str | None]:
        """Expose the audit user bound for this request."""

        user_id = database_audit._current_user_id.get()
        return {"user_id": str(user_id) if user_id is not None else None}

    response = TestClient(app).get("/", headers={"x-user-id": header_value})

    assert response.json() == {"user_id": expected_user_id}
