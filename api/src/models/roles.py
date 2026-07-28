from enum import IntEnum, StrEnum


class PlatformRoles(StrEnum):
    """Supported platform access roles."""

    user = "user"
    administrator = "administrator"


class OrganizationRoles(StrEnum):
    """Supported organization membership roles."""

    read = "read"
    write = "write"
    maintain = "maintain"
    admin = "admin"
    owner = "owner"


class Ranks(IntEnum):
    """Comparable privilege ranks for organization roles."""

    read = 1
    write = 2
    maintain = 3
    admin = 4
    owner = 5
APPLICATION_PROXY_METHOD_ROLES = {
    "DELETE": OrganizationRoles.maintain,
    "GET": OrganizationRoles.read,
    "PATCH": OrganizationRoles.write,
    "POST": OrganizationRoles.write,
    "PUT": OrganizationRoles.write,
}
APPLICATION_PROXY_METHODS = list(APPLICATION_PROXY_METHOD_ROLES)


RoleName = OrganizationRoles
