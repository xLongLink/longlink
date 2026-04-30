from .models import App, Env, User, Registry  # noqa: F401
from .services import AppsService, EnvsService, UsersService, RegistriesService

apps = AppsService()
envs = EnvsService()
registries = RegistriesService()
users = UsersService()
