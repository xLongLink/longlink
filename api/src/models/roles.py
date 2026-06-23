from enum import Enum


class PlatformRoles(str, Enum):
    """Supported platform access roles."""

    user = "user"
    support = "support"
    administrator = "administrator"


class OrganizationRoles(str, Enum):
    """Supported organization membership roles."""

    read = "read"
    write = "write"
    maintain = "maintain"
    admin = "admin"
    owner = "owner"


class ApplicationRoles(str, Enum):
    """Supported application membership roles."""

    read = "read"
    write = "write"
    maintain = "maintain"
    admin = "admin"
