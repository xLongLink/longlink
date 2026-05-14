from pathlib import Path
from src.api import routers
from longlink import LongLink
from src.envs import env

app = LongLink(env=env)
pages_dir = Path(__file__).resolve().parent / "src" / "pages"

# Register routers
for router in routers:
    app.include_router(router)


# Register pages when the app provides any.
if pages_dir.exists():
    app.include_page(pages_dir)
