from fastapi import Request, APIRouter
from longlink.utils.metadata import load_metadata

router = APIRouter()


def page_tab_value(page_path: str) -> str:
    """Return the stable tab value for a registered page path."""

    return page_path.lstrip("/").removesuffix(".xml").removeprefix("pages/")


@router.get("/metadata.json")
async def get_metadata(request: Request) -> dict[str, object]:
    """Return basic application metadata for the current SDK project."""

    metadata = load_metadata()
    pages: list[dict[str, object]] = []
    registered_pages = getattr(request.app.state, "page_registry", [])

    # Page handlers are registered from the SDK pages directory during app startup.
    for page in registered_pages:
        entry = {
            "tab": page_tab_value(page.path),
            "path": page.path.lstrip("/"),
        }

        if page.name:
            entry["name"] = page.name

        if page.icon:
            entry["icon"] = page.icon

        pages.append(entry)

    return {
        "name": metadata.name,
        "title": metadata.title,
        "summary": metadata.summary,
        "description": metadata.description,
        "version": metadata.version,
        "pages": pages,
    }
