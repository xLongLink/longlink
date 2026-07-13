from fastapi import Request, APIRouter
from pydantic import BaseModel

router = APIRouter()


class PageResponse(BaseModel):
    """Represent one SDK runtime page."""

    # Metadata
    tab: str
    icon: str | None = None
    name: str | None = None
    path: str
    route: str


@router.get("/pages.json", response_model=list[PageResponse], response_model_exclude_unset=True)
async def get_pages(request: Request):
    """Return the registered SDK runtime pages."""

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

    return pages
