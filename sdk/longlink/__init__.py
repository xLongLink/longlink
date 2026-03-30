from longlink.ui import Page
from longlink.app import create_app
from longlink.router import get, put, page, post, pages, patch, route, delete
from longlink.organization import org

# Official Starlette application instance.
app = create_app()

# Import internal routes for side-effect registration on the global router.
import longlink.routes  # noqa: E402,F401
