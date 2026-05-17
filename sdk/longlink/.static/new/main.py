from pathlib import Path

from longlink import LongLink, page
from src.api import routers
from src.envs import env

app = LongLink(env=env)


@page("/pages/dashboard.xml", icon="layout-dashboard")
def dashboard_page():
    """Return the dashboard XML page example."""

    # Load the scaffolded dashboard page directly from disk.
    return (Path(__file__).resolve().parent / "src" / "pages" / "dashboard.xml").read_text(encoding="utf-8")

# Register routers
for router in routers:
    app.include_router(router)
