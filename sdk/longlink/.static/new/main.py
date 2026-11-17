from pathlib import Path
from longlink import LongLink
from src.routes import tasks
from fastapi.staticfiles import StaticFiles

app = LongLink()
app.include_router(tasks.router)

# Serve bundled assets behind the application's production identity boundary.
assets = StaticFiles(directory=Path(__file__).resolve().parent / "src" / "assets")
app.mount("/assets", assets, name="assets")

# Declare root tabs in display order.
app.include_view(
    "models.jsx", label="Models", icon="chart-no-axes-combined", width="wide"
)
app.include_view("list.jsx", label="List", icon="list")
app.include_view("maps.jsx", label="Maps", icon="map", width="wide")
app.include_view("tasks.jsx", label="Tasks", icon="list-todo")
app.include_view("settings.jsx", label="Settings", icon="settings")
