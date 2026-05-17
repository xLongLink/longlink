from fastapi import Request, APIRouter
from pathlib import Path
from longlink.utils import Longlink
from longlink.utils.metadata import load_metadata

router = APIRouter()


@router.get("/metadata.json")
async def get_metadata(request: Request) -> dict[str, object]:
    """Return basic application metadata for the current SDK project."""

    metadata = load_metadata()
    pages: list[dict[str, object]] = []

    for page_root in request.app.state.page_roots:
        root_path = Path(page_root)
        for page_file in sorted(root_path.rglob("*.xml")):
            document = Longlink(page_file)
            document.validate()
            pages.append(
                {
                    "path": page_file.relative_to(root_path).as_posix(),
                    "content": document.content,
                }
            )

    return {
        "name": metadata.name,
        "title": metadata.title,
        "summary": metadata.summary,
        "description": metadata.description,
        "version": metadata.version,
        "pages": pages,
    }
