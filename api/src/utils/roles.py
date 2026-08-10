from src.models.roles import OrganizationRoles

ROLE_RANKS = {role: index for index, role in enumerate(OrganizationRoles, start=1)}


def rank(value: OrganizationRoles | None) -> int:
    """Return the numeric rank for one Organization role."""

    # Missing roles have no privileges in any role scope.
    if value is None:
        return 0

    return ROLE_RANKS[value]


def atleast(value: OrganizationRoles | None, required_role: OrganizationRoles) -> bool:
    """Return whether one Organization role satisfies the required role."""

    # Enforce the minimum privilege rank.
    return rank(value) >= ROLE_RANKS[required_role]
