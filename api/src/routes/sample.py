from src.router import router
from src.types.sample import Hero, Page


# A LongLink page takes a URL, with filders and stuff. If is not possible to show in a single page then the content is too complex
# Each POST request from the page shall automatically re-render the page. Given that we assume new data has come
@router.get('/sample/form', response_model=Page)
async def form():
    """Return an example page schema payload with a hero component."""

    return Page(
        title='Sample page',
        description='Sample page schema with a hero section.',
        components=[
            Hero(
                title='Welcome to VaiVai',
                description='Build modular apps for your organization with one click.',
                icon='rocket',
            )
        ],
    )
