from .models import App, Database, Env, Setting, Storage, User
from .services import AppsService, DatabasesService, EnvsService, SettingsService, StoragesService, UsersService

apps = AppsService()
databases = DatabasesService()
envs = EnvsService()
settings = SettingsService()
users = UsersService()

storages = StoragesService()
