from .models import (App, Base, ComputeRegistry, DatabaseRegistry, Env,
                     Organization, Registry, StorageRegistry, User)  # noqa: F401
from .services import (AppsService, ComputeRegistriesService,
                       DatabaseRegistriesService, EnvsService,
                       OrganizationsService, RegistriesService,
                       StorageRegistriesService, UsersService)

apps = AppsService()
envs = EnvsService()
registries = RegistriesService()
organizations = OrganizationsService()
users = UsersService()
compute = ComputeRegistriesService()
storage = StorageRegistriesService()
database = DatabaseRegistriesService()
