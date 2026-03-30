from .app import create_app
from .cron import Cron
from .organization import OrganizationSettings, organization
from .router import delete, get, page, pages, patch, post, put, route
from .ui import Page
from longlink.ui.select import Select
from longlink.ui.textarea import Textarea

# Global SDK-managed scheduling registry.
cron_manager = Cron()

# Official Starlette application instance.
app = create_app()


def cron(schedule: str):
    return cron_manager.cron(schedule)


# Import internal routes for side-effect registration on the global router.
import longlink.routes  # noqa: E402,F401
