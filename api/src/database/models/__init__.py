from src.database.models import mcp as mcp
from src.database.models import tags as tags
from src.database.models import users as users
from src.database.models import computes as computes
from src.database.models import invoices as invoices
from src.database.models import solutions as solutions
from src.database.models import operations as operations
from src.database.models import registries as registries
from src.database.models import association as association
from src.database.models import invitations as invitations
from src.database.models import permissions as permissions
from src.database.models import organizations as organizations
from src.database.models.base import PlatformModel

metadata = PlatformModel.metadata

__all__ = ["metadata"]
