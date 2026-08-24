from fastapi import Request, APIRouter
from longlink.pages import PageDefinition

router = APIRouter()


@router.get("/health", response_model=dict[str, bool], include_in_schema=False)
def health() -> dict[str, bool]:
    """Return runtime health for Kubernetes probes."""

    return {"ok": True}


@router.get("/pages.json", response_model=list[PageDefinition], response_model_exclude_none=True)
def get_pages(request: Request) -> list[PageDefinition]:
    """Return the registered SDK runtime pages."""

    # Page handlers are registered from the SDK pages directory during app startup.
    return request.app.state.longlink.pages
