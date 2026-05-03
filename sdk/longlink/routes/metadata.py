from fastapi import Request, APIRouter
from longlink.utils.metadata import load_metadata

router = APIRouter()


@router.get("/metadata.json")
async def get_metadata(request: Request) -> dict[str, object]:
    """Return basic application metadata for the current SDK project."""

    metadata = load_metadata()
    return {
        "name": metadata.name,
        "title": metadata.title,
        "summary": metadata.summary,
        "description": metadata.description,
        "version": metadata.version,
        "pages": [
            {
                "path": page.path.stem,
                "name": page.name,
                "icon": page.metadata.get("icon", "file-text"),
                "content": page.content,
            }
            for page in request.app.state.pages
        ],
    }
