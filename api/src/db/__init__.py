from .models import App, Env, User, Setting, Permission
from .services import (AppsService, EnvsService, UsersService, ComputesService,
                       SettingsService, StoragesService, DatabasesService,
                       PermissionsService)

apps = AppsService()
envs = EnvsService()
settings = SettingsService()
users = UsersService()
permissions = PermissionsService()

databases = DatabasesService()

storages = StoragesService()


computes = ComputesService()
