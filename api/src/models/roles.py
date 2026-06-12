from enum import Enum


class Roles(str, Enum):
    """Supported membership roles."""

    read = "read"
    write = "write"
    maintain = "maintain"
    admin = "admin"
    owner = "owner"


class PlatformRole(str, Enum):
    """Supported platform access roles."""

    user = "user"
    support = "support"
    administrator = "administrator"
