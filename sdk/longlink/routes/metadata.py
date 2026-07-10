from fastapi import Request, APIRouter
from pydantic import BaseModel
from longlink.utils.metadata import load_metadata

router = APIRouter()


class MetadataPageResponse(BaseModel):
    """Represent one SDK page in runtime metadata."""

    # Metadata
    tab: str
    icon: str | None = None
    name: str | None = None
    path: str
    route: str


class MetadataResponse(BaseModel):
    """Represent SDK runtime metadata."""

    # Metadata
    name: str
    title: str | None = None
    summary: str | None = None
    version: str
    description: str | None = None

    # Relationships
    pages: list[MetadataPageResponse]


@router.get("/metadata.json", response_model=MetadataResponse, response_model_exclude_unset=True)
async def get_metadata(request: Request) -> dict[str, object]:
    """Return basic application metadata for the current SDK project."""

    metadata = load_metadata()
    pages: list[dict[str, object]] = []
    registered_pages = getattr(request.app.state, "page_registry", [])

    # Page handlers are registered from the SDK pages directory during app startup.
    for page in registered_pages:
        entry = {
            "tab": page.tab,
            "path": page.path.lstrip("/"),
            "route": page.route,
        }

        # Include optional display text only when the page declares it.
        if page.name:
            entry["name"] = page.name

        # Include optional icon metadata only when the page declares it.
        if page.icon:
            entry["icon"] = page.icon

        pages.append(entry)

    return {
        "name": metadata.name,
        "title": metadata.title,
        "summary": metadata.summary,
        "description": metadata.description,
        "version": metadata.version,
        "pages": pages,
    }
