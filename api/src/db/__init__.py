from .models import App, Env, User, Setting, Storage, Database, Permission
from .services import (AppsService, EnvsService, UsersService, SettingsService,
                       StoragesService, DatabasesService, PermissionsService)

apps = AppsService()
databases = DatabasesService()
envs = EnvsService()
settings = SettingsService()
users = UsersService()
permissions = PermissionsService()

storages = StoragesService()
