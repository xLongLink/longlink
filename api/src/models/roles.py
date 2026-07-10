from enum import Enum, IntEnum


class PlatformRoles(str, Enum):
    """Supported platform access roles."""

    user = "user"
    support = "support"
    administrator = "administrator"


class PlatformRoleRanks(IntEnum):
    """Comparable privilege ranks for platform roles."""

    user = 1
    support = 2
    administrator = 3


class OrganizationRoles(str, Enum):
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


class ApplicationRoles(str, Enum):
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


class RuntimeRoleRanks(IntEnum):
    """Comparable privilege ranks for trusted runtime role strings."""

    read = 1
    write = 2
    maintain = 3
    admin = 4
    owner = 5


RoleName = PlatformRoles | OrganizationRoles | ApplicationRoles | str


class Role:
    """Namespaced role ranking and comparison helpers."""

    def rank(self, value: RoleName | None) -> int:
        """Return the numeric rank for one role within its own role scope."""

        # Missing roles have no privileges in any role scope.
        if value is None:
            return 0

        # Runtime roles are received as strings from trusted proxy headers.
        if type(value) is str:

            # Resolve trusted runtime role names through the runtime rank map.
            try:
                return RuntimeRoleRanks[value.strip().lower()].value

            # Unknown runtime role strings are not accepted.
            except KeyError:
                raise ValueError(f"Unknown role '{value}'")

        # Platform, organization, and application role enums resolve through their matching rank enum.
        if type(value) is PlatformRoles:
            return PlatformRoleRanks[value.name].value

        # Organization roles resolve through organization ranks.
        if type(value) is OrganizationRoles:
            return OrganizationRoleRanks[value.name].value

        # Application roles resolve through application ranks.
        if type(value) is ApplicationRoles:
            return ApplicationRoleRanks[value.name].value

        raise ValueError(f"Unknown role '{value}'")

    def atleast(self, value: RoleName | None, required_role: RoleName) -> bool:
        """Return whether one role is at least as privileged as the required role."""

        # Missing current roles never satisfy requirements.
        if value is None:
            return False

        # Compare roles only within the same scope.
        if type(value) is not type(required_role):
            return False

        return self.rank(value) >= self.rank(required_role)


role = Role()
