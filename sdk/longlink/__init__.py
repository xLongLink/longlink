from .app import create_app
from .cron import Cron
from .organization import OrganizationSettings, organization
from .router import Router
from .ui import Page
from longlink.ui.select import Select
from longlink.ui.textarea import Textarea

# Global SDK-managed routing and scheduling registries.
router = Router()
cron_manager = Cron()

# Official Starlette application instance.
app = create_app(router)


# Route helpers managed by the SDK global router.
def get(path: str):
    return router.get(path)


def post(path: str):
    return router.post(path)


def put(path: str):
    return router.put(path)


def patch(path: str):
    return router.patch(path)


def delete(path: str):
    return router.delete(path)


def page(path: str, name: str, icon: str):
    return router.page(path, name=name, icon=icon)


def pages() -> list[dict[str, str]]:
    return router.pages()


def cron(schedule: str):
    return cron_manager.cron(schedule)


# Import internal routes for side-effect registration on the global router.
import longlink.routes  # noqa: E402,F401
