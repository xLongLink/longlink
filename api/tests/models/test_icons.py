from src.models.icons import Icon
from src.models.applications import ApplicationCreate


def test_icon_enum_exposes_typed_members() -> None:
    """Expose icon slugs as a typed enum for API models and OpenAPI schemas."""

    payload = ApplicationCreate.model_validate(
        {
            "name": "dashboard",
            "icon": "layout-grid",
            "image": "ghcr.io/longlink/dashboard:latest",
        }
    )

    assert len(Icon) == 30
    assert Icon.LAYOUT_GRID.value == "layout-grid"
    assert Icon.ROCKET.value == "rocket"
    assert payload.icon is Icon.LAYOUT_GRID
