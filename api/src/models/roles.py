from enum import StrEnum


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


APPLICATION_PROXY_METHOD_ROLES = {
    "DELETE": OrganizationRoles.maintain,
    "GET": OrganizationRoles.read,
    "PATCH": OrganizationRoles.write,
    "POST": OrganizationRoles.write,
    "PUT": OrganizationRoles.write,
}
APPLICATION_PROXY_METHODS = list(APPLICATION_PROXY_METHOD_ROLES)
