from .models import App, Base, ComputeRegistry, DatabaseRegistry, Env, Location, Org, StorageRegistry, User
from .services import (
    AppsService,
    ComputeRegistriesService,
    DatabaseRegistriesService,
    EnvsService,
    LocationsService,
    OrgsService,
    StorageRegistriesService,
    UsersService,
)

__all__ = [
    "App",
    "AppsService",
    "Base",
    "ComputeRegistry",
    "ComputeRegistriesService",
    "DatabaseRegistry",
    "DatabaseRegistriesService",
    "Env",
    "EnvsService",
    "Location",
    "LocationsService",
    "Org",
    "OrgsService",
    "StorageRegistry",
    "StorageRegistriesService",
    "User",
    "UsersService",
]

apps = AppsService()
envs = EnvsService()
orgs = OrgsService()
users = UsersService()
locations = LocationsService()
compute = ComputeRegistriesService()
storage = StorageRegistriesService()
database = DatabaseRegistriesService()
