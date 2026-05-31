from pathlib import Path
from src.api import routers
from longlink import LongLink
from src.envs import env

app = LongLink(env=env)


def dashboard_page():
    """Return the dashboard XML page example."""

    # Load the scaffolded dashboard page directly from disk.
    return (Path(__file__).resolve().parent / "src" / "pages" / "dashboard.xml").read_text(encoding="utf-8")

# Register routers
for router in routers:
    app.include_router(router)
