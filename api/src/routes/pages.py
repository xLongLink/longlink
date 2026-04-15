import re
from fastapi import HTTPException
from pathlib import Path
from src.router import router
from fastapi.responses import Response

PAGES_DIR = Path(__file__).resolve().parents[2] / 'pages'
PAGE_NAME_PATTERN = re.compile(r'^[a-z0-9-]+$')


@router.get('/pages/{page_name}')
async def get_page(page_name: str) -> Response:
    normalized_page_name = page_name.strip().lower()

    if not PAGE_NAME_PATTERN.match(normalized_page_name):
        raise HTTPException(status_code=404, detail='Page not found')

    page_path = (PAGES_DIR / f'{normalized_page_name}.xml').resolve()

    if not page_path.is_file() or page_path.parent != PAGES_DIR.resolve():
        raise HTTPException(status_code=404, detail='Page not found')

    return Response(content=page_path.read_text(encoding='utf-8'), media_type='application/xml')
