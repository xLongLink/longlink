from typing import Literal
from pathlib import Path
from longlink import APIRouter
from starlette import responses

router = APIRouter(prefix="/api/demo/photos")


@router.get(
    "/{photo_id}",
    response_class=responses.FileResponse,
    responses={200: {"content": {"image/jpeg": {}}}},
)
def photo_get_endpoint(
    photo_id: Literal["riverside", "skyline", "garden", "harbor"],
) -> responses.FileResponse:
    """Serve one bundled example photo without external image services."""

    # Restrict file access to the named demo assets validated by FastAPI.
    photo = Path(__file__).resolve().parents[1] / "assets" / f"{photo_id}.jpg"
    return responses.FileResponse(photo, media_type="image/jpeg")
