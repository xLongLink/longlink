from .ui import Page
from .api import get, post
from .app import LongLink
from .organization import OrganizationSettings
from .router import Router
from .envs import envs

from longlink.ui.textarea import Textarea
from longlink.ui.select import Select


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
