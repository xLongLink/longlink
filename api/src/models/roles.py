from enum import Enum


class RoleName(str, Enum):
    """Supported organization and app access roles."""

    read = "read"
    write = "write"
    maintain = "maintain"
    admin = "admin"
    owner = "owner"
