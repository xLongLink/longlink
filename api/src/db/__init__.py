from .models import (App, Env, Org, Base, User, Registry,  # noqa: F401
                     ComputeRegistry, StorageRegistry, DatabaseRegistry)
from .services import (AppsService, EnvsService, OrgsService, UsersService,
                       LocationsService, RegistriesService,
                       ComputeRegistriesService, StorageRegistriesService,
                       DatabaseRegistriesService)

apps = AppsService()
envs = EnvsService()
registries = RegistriesService()
orgs = OrgsService()
users = UsersService()
locations = LocationsService()
compute = ComputeRegistriesService()
storage = StorageRegistriesService()
database = DatabaseRegistriesService()
