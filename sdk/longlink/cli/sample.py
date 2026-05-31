import click
import uvicorn
from fastapi import FastAPI
from longlink.app import SPAStaticFiles
from longlink.utils import Longlink
from longlink.routes import routes
from longlink.constants import ROOT

SAMPLE_ROOT = ROOT / ".static" / "new"


def load_sample_app():
    """Build the bundled sample XML page app."""

    sample_page = SAMPLE_ROOT / "src" / "pages" / "dashboard.xml"

    # Validate the bundled XML page once so the sample fails fast if it breaks.
    document = Longlink(sample_page)
    document.validate()

    app = FastAPI(title="LongLink Sample", version="0.1.0")
    app.state.page_roots = [sample_page.parent]

    # Register the SDK routers before mounting the shared web shell.
    for router in routes:
        app.include_router(router)

    @app.get("/api/me")
    async def sample_user() -> dict[str, object]:
        """Return a minimal authenticated user for the shared web shell."""

        return {
            "success": True,
            "detail": "Sample user loaded",
            "data": {
                "id": 1,
                "name": "Sample User",
                "email": "sample@example.com",
                "avatar": "",
                "admin": False,
                "theme": "dark",
                "accent": "neutral",
                "radius": "medium",
                "language": "en",
                "oidc_subject": None,
                "orgs": [],
            },
        }

    # Mount the normal SDK web bundle after API routes so XML and JSON endpoints stay reachable.
    static_dir = ROOT / ".static" / "web"
    if static_dir.exists():
        app.mount("/", SPAStaticFiles(directory=static_dir, html=True), name="static")

    return app


@click.command(name="sample")
@click.option("--host", default="127.0.0.1", show_default=True, help="Host to bind the sample app to.")
@click.option("--port", default=1707, show_default=True, type=int, help="Port to bind the sample app to.")
def sample_command(host: str, port: int) -> None:
    """Run the bundled sample XML page locally."""

    uvicorn.run(
        "longlink.cli.sample:load_sample_app",
        factory=True,
        host=host,
        port=port,
    )
