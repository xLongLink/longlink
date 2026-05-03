from fastapi import APIRouter
from src.env import env
from src.routes.pages import get_all_pages

router = APIRouter()


@router.get("/metadata.json")
def metadata() -> dict:
    """Return the API metadata document."""
    return {
        "organization_name": env.ORGANIZATION_NAME,
        "pages": [page.model_dump() for page in get_all_pages()],
    }
