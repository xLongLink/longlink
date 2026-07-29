import pytest
from pydantic import ValidationError
from src.models.roles import OrganizationRoles
from src.models.organizations import OrganizationCreate, OrganizationMemberUpdate, OrganizationInvitationCreate

pytestmark = pytest.mark.no_db


def test_organization_create_rejects_invalid_metadata() -> None:
    """Reject Organization creation payloads with invalid metadata."""

    # Invalid Organization values fail before route-level access and service checks.
    with pytest.raises(ValidationError):
        OrganizationCreate.model_validate({"name": ""})


def test_organization_invitation_create_accepts_email_and_role() -> None:
    """Accept an Organization invitation payload with a valid email and role."""

    # Validate the invitation payload used by Organization owners.
    payload = OrganizationInvitationCreate.model_validate({"email": "member@example.com", "role": "read"})

    assert payload.email == "member@example.com"
    assert payload.role == OrganizationRoles.read


@pytest.mark.parametrize("payload", [{"email": "not-email", "role": "read"}, {"email": "member@example.com", "role": "ownerish"}])
def test_organization_invitation_create_rejects_invalid_email_or_role(payload: dict[str, str]) -> None:
    """Reject Organization invitations with invalid identity or role values."""

    # Invalid invitations fail before service-layer membership changes.
    with pytest.raises(ValidationError):
        OrganizationInvitationCreate.model_validate(payload)


def test_organization_member_update_accepts_role() -> None:
    """Accept an Organization member role update payload."""

    # Validate member role updates at the route model boundary.
    payload = OrganizationMemberUpdate.model_validate({"role": "maintain"})

    assert payload.role == OrganizationRoles.maintain


def test_organization_member_update_rejects_unknown_role() -> None:
    """Reject Organization member role updates outside known roles."""

    # Unknown roles fail before service-layer permission checks.
    with pytest.raises(ValidationError):
        OrganizationMemberUpdate.model_validate({"role": "manager"})
