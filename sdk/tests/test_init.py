import longlink
from longlink import Model, Context, LongLink
from longlink.app import LongLink as Application
from longlink.context import Context as RequestContext
from longlink.database.relations import Model as DatabaseModel


def test_public_sdk_imports_preserve_runtime_types() -> None:
    """Keep the documented package entrypoint usable without internal import paths."""

    # Assert
    assert LongLink is Application
    assert Context is RequestContext
    assert Model is DatabaseModel
    assert set(longlink.__all__) == {
        "APIRouter",
        "Audit",
        "Context",
        "Environments",
        "LongLink",
        "Model",
        "User",
        "UserRelationship",
        "permissions",
    }
