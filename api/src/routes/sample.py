from src.ui import Page
from src.router import router


# A LongLink page takes a URL, with filders and stuff. If is not possible to show in a single page then the content is too complex
# Each POST request from the page shall automatically re-render the page. Given that we assume new data has come
@router.get('/sample/page')
async def form():
    """Return an example page schema payload with a hero component."""
    page = Page()
    page.hero(title="Data Table", subtitle="This is an example of a data table component.")

    return list(page)
