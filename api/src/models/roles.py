from enum import StrEnum


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
