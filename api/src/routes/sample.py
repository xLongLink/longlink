from src.ui import Page, Component
from src.router import router


# A LongLink page takes a URL, with filders and stuff. If is not possible to show in a single page then the content is too complex
# Each POST request from the page shall automatically re-render the page. Given that we assume new data has come
@router.get('/sample/form', response_model=list[Component])
async def form():
    """Return an example page schema payload with a hero component."""
    page = Page()
    hero = page.hero(title="Data Table")

    return list(page)
