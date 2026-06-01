from pathlib import Path
from src.api import routers
from longlink import LongLink
from src.envs import env

app = LongLink(env=env)

# Point the app at the scaffolded XML pages so `longlink dev` serves them.
app.state.page_roots = [Path(__file__).resolve().parent / "src" / "pages"]

# Register routers.
for router in routers:
    app.include_router(router)
