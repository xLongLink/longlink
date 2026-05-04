from pathlib import Path
from longlink import LongLink
from sample.src.api import routers
from sample.src.envs import env

app = LongLink(env=env)
pages_dir = Path(__file__).resolve().parent / "src" / "pages"

# Register routers
for router in routers:
    app.include_router(router)


# Register pages
app.include_page(pages_dir)
