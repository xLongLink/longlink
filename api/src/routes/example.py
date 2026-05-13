from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api")


class ProfilePayload(BaseModel):
    """Payload used to update the example profile card."""

    fullName: str
    email: str
    notes: str


class MetricsPayload(BaseModel):
    """Payload used to refresh the example metrics."""

    selectedUserId: int
    quantity: int


class SelectUserPayload(BaseModel):
    """Payload used to select a user from the list."""

    userId: int


_profile = {
    "title": "Ada Lovelace",
    "fullName": "Ada Lovelace",
    "email": "ada@example.com",
    "notes": "Build the first program",
}
_selected_user_id = 0
_selected_quantity = 1
_users = [
    {"id": 1, "name": "Ada Lovelace", "role": "admin"},
    {"id": 2, "name": "Grace Hopper", "role": "engineer"},
    {"id": 3, "name": "Alan Turing", "role": "analyst"},
]


def _metrics_total() -> int:
    """Compute the demo metric total from the current state."""

    return _selected_quantity * 10 + _selected_user_id


@router.get("/example/profile")
async def get_profile() -> dict[str, str]:
    """Return the example profile data used by the XML page."""

    return {"title": _profile["title"], **_profile}


@router.post("/example/profile")
async def update_profile(payload: ProfilePayload) -> dict[str, str]:
    """Update the example profile data and return the new record."""

    _profile.update(
        {
            "title": payload.fullName,
            "fullName": payload.fullName,
            "email": payload.email,
            "notes": payload.notes,
        }
    )
    return {"title": _profile["title"], **_profile}


@router.get("/example/users")
async def get_users() -> dict[str, list[dict[str, int | str]]]:
    """Return the example user list for the XML page."""

    return {"items": _users}


@router.post("/example/users/select")
async def select_user(payload: SelectUserPayload) -> dict[str, int]:
    """Store the selected user id for the demo page."""

    global _selected_user_id
    _selected_user_id = payload.userId
    return {"selectedUserId": _selected_user_id}


@router.get("/example/metrics")
async def get_metrics() -> dict[str, int]:
    """Return the current example metrics snapshot."""

    return {"total": _metrics_total()}


@router.post("/example/metrics")
async def refresh_metrics(payload: MetricsPayload) -> dict[str, int]:
    """Refresh the example metrics using the submitted form payload."""

    global _selected_user_id, _selected_quantity
    _selected_user_id = payload.selectedUserId
    _selected_quantity = payload.quantity
    return {"total": _metrics_total()}
