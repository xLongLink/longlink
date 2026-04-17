# Import internal routes for side-effect registration on the global router.
import longlink.routes  # noqa: E402,F401
from longlink.app import App, create_app, create_longlink_app
from longlink.envs import ENV, ENVDev, Envs, EnvsDev, envs, get_envs
from longlink.organization import org
from longlink.predefined import issues_page, sample_page
from longlink.router import (delete, get, page, pages, patch, post, put, route,
                             xml_page)
from longlink.xml import load_page_schema_from_xml

# Official Starlette application wrapper and instance.
application = create_longlink_app()
app = application.fastapi
