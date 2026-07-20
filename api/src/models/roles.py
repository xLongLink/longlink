from enum import IntEnum, StrEnum


class PlatformRoles(StrEnum):
    """Supported platform access roles."""

    user = "user"
    support = "support"
    administrator = "administrator"


class PlatformRoleRanks(IntEnum):
    """Comparable privilege ranks for platform roles."""

    user = 1
    support = 2
    administrator = 3


class OrganizationRoles(StrEnum):
    """Supported organization membership roles."""

    read = "read"
    write = "write"
    maintain = "maintain"
    admin = "admin"
    owner = "owner"


class Ranks(IntEnum):
    """Comparable privilege ranks for organization and application roles."""

    read = 1
    write = 2
    maintain = 3
    admin = 4
    owner = 5


class ApplicationRoles(StrEnum):
    """Supported application membership roles."""

    read = "read"
    write = "write"
    maintain = "maintain"
    admin = "admin"


APPLICATION_PROXY_METHOD_ROLES = {
    "DELETE": ApplicationRoles.maintain,
    "GET": ApplicationRoles.read,
    "PATCH": ApplicationRoles.write,
    "POST": ApplicationRoles.write,
    "PUT": ApplicationRoles.write,
}
APPLICATION_PROXY_METHODS = list(APPLICATION_PROXY_METHOD_ROLES)


RoleName = PlatformRoles | OrganizationRoles | ApplicationRoles
