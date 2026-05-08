import src.db as db
from fastapi import APIRouter, HTTPException
from src.routes.pages import get_all_pages

router = APIRouter(prefix="/api")


@router.get("/{name}/metadata.json")
async def metadata(name: str) -> dict:
    """Return the metadata document for one organization."""
    organization = await db.organizations.get(name)
    if organization is None:
        raise HTTPException(status_code=404, detail=f"Organization '{name}' not found")

    return {
        "organization": organization.model_dump(),
        "pages": [page.model_dump() for page in get_all_pages()],
    }
