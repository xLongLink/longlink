from .models import (App, Env, Base, User, Permission, Registry,  # noqa: F401
                     Org, ComputeRegistry, StorageRegistry,
                     DatabaseRegistry)
from .services import (AppsService, EnvsService, UsersService,
                       RegistriesService, OrgsService,
                       ComputeRegistriesService, StorageRegistriesService,
                       DatabaseRegistriesService)

apps = AppsService()
envs = EnvsService()
registries = RegistriesService()
orgs = OrgsService()
users = UsersService()
compute = ComputeRegistriesService()
storage = StorageRegistriesService()
database = DatabaseRegistriesService()
