from .models import (App, Env, User, Setting, Permission, ComputeConnection,
                     StorageConnection, DatabaseConnection)
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
