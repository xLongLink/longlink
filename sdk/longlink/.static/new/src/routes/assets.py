from fastapi import HTTPException
from longlink import Router, assets
from fastapi.responses import Response

router = Router()


@router.get("/assets/logo")
async def organization_logo_get_endpoint() -> Response:
    """Return the organization logo loaded from LongLink organization assets."""

    try:
        logo = assets.logo()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Organization logo asset not found") from exc

    return Response(content=logo.content, media_type=logo.content_type)
