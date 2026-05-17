import src.db as db
from fastapi import APIRouter, HTTPException
from src.models import PageInfo
from src.constants import PAGES
from longlink.utils import Longlink

router = APIRouter(prefix="/api")


@router.get("/{name}/metadata.json")
async def metadata(name: str) -> dict:
    """Return the metadata document for one organization."""
    organization = await db.organizations.get(name)
    if organization is None:
        raise HTTPException(status_code=404, detail=f"Organization '{name}' not found")

    pages: list[PageInfo] = []

    # Scan XML pages for organization metadata.
    if PAGES.is_dir():
        for page_file in sorted(PAGES.glob("*.xml")):
            document = Longlink(page_file)
            document.validate()
            pages.append(
                PageInfo(
                    name=document.metadata.get("name", page_file.stem.replace("-", " ").title()),
                    path=page_file.stem,
                    content=document.content,
                )
            )

    return {
        "organization": organization.model_dump(),
        "pages": [page.model_dump() for page in pages],
    }
