from .models import User, Organization
from .services import OrgsService, UsersService

orgs = OrgsService()
users = UsersService()
