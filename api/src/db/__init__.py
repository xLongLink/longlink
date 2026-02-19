from .models import App, Setting, User
from .services import AppsService, SettingsService, UsersService

apps = AppsService()
settings = SettingsService()
users = UsersService()
