from longlink.router import get, pages


@get('/pages')
async def get_available_pages() -> list[dict[str, str]]:
    """Pages route."""

    return pages()
