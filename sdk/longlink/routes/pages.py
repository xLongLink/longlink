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
    runtime_version: str


@router.get("/pages.json", response_model=list[PageResponse], response_model_exclude_none=True)
def get_pages(request: Request) -> list[PageResponse]:
    """Return the registered SDK runtime pages."""

    # Page handlers are registered from the SDK pages directory during app startup.
    return [
        PageResponse(
            tab=page.tab,
            path=page.path.lstrip("/"),
            route=page.route,
            runtime_version=page.runtime_version,
            name=page.name,
            icon=page.icon,
        )
        for page in request.app.state.longlink.pages
    ]
