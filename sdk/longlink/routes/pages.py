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
def get_pages(request: Request):
    """Return the registered SDK runtime pages."""

    # Page handlers are registered from the SDK pages directory during app startup.
    return [
        {
            "tab": page.tab,
            "path": page.path.lstrip("/"),
            "route": page.route,
            **({"name": page.name} if page.name else {}),
            **({"icon": page.icon} if page.icon else {}),
        }
        for page in request.app.state.page_registry
    ]
