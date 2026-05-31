from .models import (App, Env, Org, Base, User,  # noqa: F401
                     ComputeRegistry, StorageRegistry, DatabaseRegistry)
from .services import (AppsService, EnvsService, OrgsService, UsersService,
                       LocationsService,
                       ComputeRegistriesService, StorageRegistriesService,
                       DatabaseRegistriesService)

apps = AppsService()
envs = EnvsService()
orgs = OrgsService()
users = UsersService()
locations = LocationsService()
compute = ComputeRegistriesService()
storage = StorageRegistriesService()
database = DatabaseRegistriesService()
