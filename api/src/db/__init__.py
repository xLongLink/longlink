from .models import App, Env, User, Setting, Permission  # noqa: F401
from .services import (AppsService, EnvsService, UsersService, ComputesService,
                       SettingsService, StoragesService, DatabasesService,
                       PermissionsService)

apps = AppsService()
envs = EnvsService()
settings = SettingsService()
users = UsersService()
permissions = PermissionsService()

storages = StoragesService()

computes = ComputesService()
databases = DatabasesService()
