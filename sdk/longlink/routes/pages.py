from fastapi import Request, APIRouter, HTTPException
from pathlib import Path
from longlink.utils import Longlink
from fastapi.responses import Response

router = APIRouter()


@router.get("/pages/{page_path:path}.xml")
async def get_page(page_path: str, request: Request) -> Response:
    """Retrieve raw XML page content for a nested page path."""

    normalized_path = Path(page_path.strip().lstrip("/"))
    if normalized_path.suffix != ".xml":
        normalized_path = normalized_path.with_suffix(".xml")

    for page_root in request.app.state.page_roots:
        page_file = (Path(page_root) / normalized_path).resolve()
        if page_file.is_file() and page_file.is_relative_to(Path(page_root).resolve()):
            document = Longlink(page_file)
            document.validate()
            return Response(content=document.content, media_type="application/xml")

    raise HTTPException(status_code=404, detail="Document not found")
