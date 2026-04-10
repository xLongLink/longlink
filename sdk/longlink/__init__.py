# Import internal routes for side-effect registration on the global router.
import longlink.routes  # noqa: E402,F401
from longlink.predefined import issues_page
from longlink.ui import Page
from longlink.app import create_app
from longlink.router import get, put, page, pages, patch, route, delete, post, xml_page
from longlink.organization import org
from longlink.xml import load_page_schema_from_xml

# Official Starlette application instance.
app = create_app()
