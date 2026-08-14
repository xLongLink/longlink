from src.models.roles import OrganizationRoles

ROLE_RANKS = {role: index for index, role in enumerate(OrganizationRoles, start=1)}


def atleast(value: OrganizationRoles, required_role: OrganizationRoles) -> bool:
    """Return whether one Organization role satisfies the required role."""

    # Enforce the minimum privilege rank.
    return ROLE_RANKS[value] >= ROLE_RANKS[required_role]
