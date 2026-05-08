from src.db import users as users_service
from fastapi import APIRouter
from src.routes.pages import get_all_pages

router = APIRouter()


@router.get("/users")
async def list_users() -> dict[str, list[dict[str, int | str | None]]]:
    """Return all users known to the control plane."""

    users = await users_service.list()
    return {
        "items": [
            {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "avatar": user.avatar,
                "oidcSubject": user.oidc_subject,
            }
            for user in users
        ]
    }


@router.get("/users/metadata.json")
async def users_metadata() -> dict[str, list[dict[str, str | None]]]:
    """Return the example page metadata document for the users view."""

    pages = [page.model_dump() for page in get_all_pages() if page.path == "example"]
    return {"pages": pages}
