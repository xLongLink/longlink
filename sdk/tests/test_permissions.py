import pytest
from typing import Any
from longlink import APIRouter, permissions
from pydantic import ValidationError
from longlink.app import LongLink


@pytest.mark.usefixtures("solution_source")
@pytest.mark.parametrize("declaration", ["decorator", "openapi"])
@pytest.mark.parametrize(
    "roles",
    [
        "reviewer",
        {"reviewer"},
        ["reviewer", "reviewer"],
        ["Reviewer"],
        [""],
        ["a" * 65],
        [f"role{index}" for index in range(65)],
        [1],
        [["reviewer"]],
    ],
)
def test_invalid_roles_fail_at_declaration_boundary(declaration: str, roles: object) -> None:
    """Reject invalid eager and raw OpenAPI role declarations before runtime admission."""

    # Arrange
    router = APIRouter()

    async def endpoint() -> int:
        """Return a business response."""

        return 1

    # Act and assert
    if declaration == "decorator":
        options: dict[str, Any] = {"roles": roles}
        with pytest.raises(ValueError, match="Roles must"):
            router.get("/items", **options)(endpoint)
        assert router.routes == []
    else:
        router.get("/items", response_model=int, openapi_extra={"x-longlink-roles": roles})(endpoint)
        app = LongLink()
        app.include_router(router)
        with pytest.raises(ValidationError, match="Roles must"):
            permissions.discover(app.permission_routes())


@pytest.mark.usefixtures("solution_source")
@pytest.mark.parametrize("declaration", ["decorator", "openapi"])
def test_role_sequences_are_normalized_without_changing_order(declaration: str) -> None:
    """Preserve ordered Sequence declarations while normalizing the catalog to lists."""

    # Arrange
    router = APIRouter()
    roles = ("write", "reviewer")
    options: dict[str, Any] = {"roles": roles} if declaration == "decorator" else {"openapi_extra": {"x-longlink-roles": roles}}

    @router.get("/items", response_model=int, **options)
    async def endpoint() -> int:
        """Return a business response."""

        return 1

    app = LongLink()
    app.include_router(router)

    # Act
    catalog = permissions.discover(app.permission_routes())

    # Assert
    assert catalog.endpoints[0].roles == ["write", "reviewer"]
    assert catalog.access("reviewer").endpoints == [0]


@pytest.mark.usefixtures("solution_source")
def test_catalog_digest_ignores_handler_names_and_summaries() -> None:
    """Keep permission grants valid through non-authorizing documentation changes."""

    # Arrange
    original = LongLink()
    renamed = LongLink()

    @original.get("/items", response_model=int, summary="Original summary")
    async def read_items() -> int:
        """Return a business response."""

        return 1

    @renamed.get("/items", response_model=int, summary="Revised summary")
    async def list_items() -> int:
        """Return the same business response."""

        return 1

    # Act
    original_catalog = permissions.discover(original.permission_routes())
    renamed_catalog = permissions.discover(renamed.permission_routes())

    # Assert
    assert original_catalog.digest == renamed_catalog.digest
    assert renamed_catalog.access("read") == original_catalog.access("read")


@pytest.mark.parametrize("change", [{"roles": ["reviewer"]}, {"method": "POST"}, {"path": "/reports"}])
def test_catalog_digest_binds_authorization_changes(change: dict[str, object]) -> None:
    """Invalidate grants whenever defaults or operation identity changes."""

    # Arrange
    operation = {"path": "/items", "roles": ["read"], "method": "GET"}
    original = permissions.Catalog(endpoints=[permissions.Endpoint.model_validate(operation)])
    changed = permissions.Catalog(endpoints=[permissions.Endpoint.model_validate(operation | change)])

    # Act and assert
    assert changed.digest != original.digest


@pytest.mark.parametrize("paths", [["/items", "/items"], ["/reports", "/items"]])
def test_catalog_rejects_duplicate_or_unsorted_operation_identities(paths: list[str]) -> None:
    """Prevent endpoint-index grants from binding an ambiguous catalog."""

    # Arrange
    endpoints = [permissions.Endpoint(path=path, roles=[], method="GET") for path in paths]

    # Act and assert
    with pytest.raises(ValidationError, match="unique, and sorted"):
        permissions.Catalog(endpoints=endpoints)


@pytest.mark.parametrize("obsolete", [{"key": "GET /items"}, {"summary": "Read items"}])
def test_endpoint_rejects_removed_wire_fields(obsolete: dict[str, str]) -> None:
    """Require callers to adopt the authoritative method/path-only identity contract."""

    # Arrange
    operation = {"path": "/items", "roles": [], "method": "GET"}

    # Act and assert
    with pytest.raises(ValidationError, match="Extra inputs are not permitted"):
        permissions.Endpoint.model_validate(operation | obsolete)
