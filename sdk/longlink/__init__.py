from .ui import Page
from .app import LongLink
from .router import Router
from .organization import OrganizationSettings, organization
from longlink.ui.select import Select
from longlink.ui.textarea import Textarea

# Global SDK-managed application instance.
app = LongLink()


# Route helpers managed by the SDK global app.
def get(path: str):
    return app.get(path)


def post(path: str):
    return app.post(path)


def put(path: str):
    return app.put(path)


def patch(path: str):
    return app.patch(path)


def delete(path: str):
    return app.delete(path)


def page(path: str, name: str, icon: str):
    return app.page(path, name=name, icon=icon)


def cron(schedule: str):
    return app.cron(schedule)


# Import internal routes for side-effect registration on the global app.
import longlink.routes  # noqa: E402,F401
