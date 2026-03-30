"""Pages route."""

from longlink import app, get


@get('/pages')
async def get_available_pages() -> list[dict[str, str]]:
    return app.pages()
