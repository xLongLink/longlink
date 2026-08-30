"""Load every Platform ORM model and expose their shared metadata."""

from src.database.models import users as users
from src.database.models import computes as computes
from src.database.models import storages as storages
from src.database.models import databases as databases
from src.database.models import operations as operations
from src.database.models import association as association
from src.database.models import invitations as invitations
from src.database.models import applications as applications
from src.database.models import organizations as organizations
from src.database.models.base import PlatformModel

metadata = PlatformModel.metadata

__all__ = ["metadata"]
