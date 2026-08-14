from src.models.roles import OrganizationRoles

ROLE_RANKS = {role: index for index, role in enumerate(OrganizationRoles, start=1)}


def rank(value: OrganizationRoles) -> int:
    """Return the numeric rank for one Organization role."""

    return ROLE_RANKS[value]


def atleast(value: OrganizationRoles, required_role: OrganizationRoles) -> bool:
    """Return whether one Organization role satisfies the required role."""

    # Enforce the minimum privilege rank.
    return rank(value) >= ROLE_RANKS[required_role]
