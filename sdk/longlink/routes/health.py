from fastapi import APIRouter

router = APIRouter()


@router.get("/health", response_model=dict[str, bool], include_in_schema=False)
def health() -> dict[str, bool]:
    """Return runtime health for Kubernetes probes."""

    return {"ok": True}
