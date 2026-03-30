from .models import App, Env, User, Setting, Storage, Database
from .services import (AppsService, EnvsService, UsersService, SettingsService,
                       StoragesService, DatabasesService)

apps = AppsService()
databases = DatabasesService()
envs = EnvsService()
settings = SettingsService()
users = UsersService()

storages = StoragesService()
