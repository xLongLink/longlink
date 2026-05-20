from .models import (App, Env, Base, User, Registry,  # noqa: F401
                     Organization, ComputeRegistry, StorageRegistry,
                     DatabaseRegistry)
from .services import (AppsService, EnvsService, UsersService,
                       RegistriesService, OrganizationsService,
                       ComputeRegistriesService, StorageRegistriesService,
                       DatabaseRegistriesService)

apps = AppsService()
envs = EnvsService()
registries = RegistriesService()
organizations = OrganizationsService()
users = UsersService()
compute = ComputeRegistriesService()
storage = StorageRegistriesService()
database = DatabaseRegistriesService()
