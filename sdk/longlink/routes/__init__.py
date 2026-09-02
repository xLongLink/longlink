from fastapi import Request, APIRouter
from longlink.views import ViewDefinition

router = APIRouter()


@router.get("/health", include_in_schema=False)
def health() -> dict[str, bool]:
    """Return runtime health for Kubernetes probes."""

    return {"ok": True}


@router.get("/views.json", response_model=list[ViewDefinition], response_model_exclude_none=True)
def get_views(request: Request) -> list[ViewDefinition]:
    """Return the registered SDK runtime views."""

    # View handlers are registered from the SDK views directory during app startup.
    return request.app.state.longlink.views
