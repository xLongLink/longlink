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


class OrganizationRoleRanks(IntEnum):
    """Comparable privilege ranks for organization roles."""

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


class ApplicationRoleRanks(IntEnum):
    """Comparable privilege ranks for application roles."""

    read = 1
    write = 2
    maintain = 3
    admin = 4


class ApplicationProxyMethodRanks(IntEnum):
    """Minimum application role ranks required by proxied HTTP methods."""

    DELETE = ApplicationRoleRanks.maintain.value
    GET = ApplicationRoleRanks.read.value
    PATCH = ApplicationRoleRanks.write.value
    POST = ApplicationRoleRanks.write.value
    PUT = ApplicationRoleRanks.write.value


APPLICATION_PROXY_METHODS = list(ApplicationProxyMethodRanks.__members__)


RoleName = PlatformRoles | OrganizationRoles | ApplicationRoles
