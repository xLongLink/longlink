from fastapi import Request, Response, APIRouter

router = APIRouter()


@router.get("/pages/{name}")
async def get_page(name: str, request: Request) -> Response:
    """Retrieve raw XML page content for a given page name."""

    normalized_name = name.strip().lower()
    for page in request.app.state.pages:
        if page.path.stem.strip().lower() == normalized_name:
            page.validate()
            return Response(content=page.content, media_type="application/xml")
    return Response(content="", media_type="application/xml")
