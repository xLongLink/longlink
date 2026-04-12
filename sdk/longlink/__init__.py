# Import internal routes for side-effect registration on the global router.
import longlink.routes  # noqa: E402,F401
from longlink.app import create_app
from longlink.xml import load_page_schema_from_xml
from longlink.router import (get, put, page, post, pages, patch, route, delete,
                             xml_page)
from longlink.predefined import issues_page, sample_page
from longlink.organization import org

# Official Starlette application instance.
app = create_app()
