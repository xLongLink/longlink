from pathlib import Path
from longlink import LongLink
from src.routes import tasks, phases, projects
from fastapi.staticfiles import StaticFiles

app = LongLink()
app.include_router(phases.router)
app.include_router(projects.router)
app.include_router(tasks.router)

# Serve bundled assets behind the application's production identity boundary.
assets = StaticFiles(directory=Path(__file__).resolve().parent / "src" / "assets")
app.mount("/assets", assets, name="assets")

# Declare root tabs in display order; nested project Views remain routable.
app.include_view("models.jsx", label="Models", icon="sparkles")
app.include_view("projects.jsx", label="Projects", icon="folder-kanban")
app.include_view("tasks.jsx", label="Tasks", icon="list-todo")
app.include_view("settings.jsx", label="Settings", icon="settings")
