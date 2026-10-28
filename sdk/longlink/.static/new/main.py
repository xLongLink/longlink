from longlink import LongLink
from src.routes import phases, photos, projects

app = LongLink()
app.include_router(phases.router)
app.include_router(photos.router)
app.include_router(projects.router)

# Declare root tabs in display order; nested project Views remain routable.
app.include_view("projects.jsx", label="Projects", icon="folder-kanban")
app.include_view("table.jsx", label="Table", icon="table")
app.include_view("settings.jsx", label="Settings", icon="settings")
