from src.models.roles import OrganizationRoles

_ROLE_RANKS = {role: index for index, role in enumerate(OrganizationRoles)}


def atleast(value: OrganizationRoles, required_role: OrganizationRoles) -> bool:
    """Return whether one Organization role satisfies the required role."""

    # Enforce the minimum privilege rank.
    return _ROLE_RANKS[value] >= _ROLE_RANKS[required_role]
