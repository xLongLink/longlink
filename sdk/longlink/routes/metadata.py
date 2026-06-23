from fastapi import APIRouter
from inspect import isawaitable
from longlink.pages import page_registry
from fastapi.responses import Response
from longlink.utils.metadata import load_metadata

router = APIRouter()


@router.get("/metadata.json")
async def get_metadata() -> dict[str, object]:
    """Return basic application metadata for the current SDK project."""

    metadata = load_metadata()
    pages: list[dict[str, object]] = []

    # Page handlers are registered through the router.page decorator.
    for page in page_registry:
        content = page.handler()
        if isawaitable(content):
            content = await content

        if isinstance(content, Response):
            body = content.body
            content = body.decode(content.charset or "utf-8") if isinstance(body, bytes) else str(body)
        else:
            content = str(content)

        pages.append({"path": page.path.lstrip("/"), "content": content})

    return {
        "name": metadata.name,
        "title": metadata.title,
        "summary": metadata.summary,
        "description": metadata.description,
        "version": metadata.version,
        "pages": pages,
    }
