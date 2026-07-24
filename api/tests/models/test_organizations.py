from uuid import uuid4
import pytest
from pydantic import ValidationError
from src.models.roles import OrganizationRoles
from src.models.organizations import OrganizationCreate, OrganizationInvitationCreate, OrganizationMemberUpdate

pytestmark = pytest.mark.no_db


def test_organization_create_accepts_infrastructure_assignment() -> None:
    """Accept the Organization creation payload submitted by the Platform UI."""

    # Validate the immutable infrastructure assignment at the API model boundary.
    compute_id = uuid4()
    database_id = uuid4()
    storage_id = uuid4()
    payload = OrganizationCreate.model_validate(
        {
            "name": "Acme",
            "avatar": "https://example.com/acme.png",
            "country": "CH",
            "compute_id": compute_id,
            "database_id": database_id,
            "storage_id": storage_id,
        }
    )

    assert payload.name == "Acme"
    assert payload.country == "CH"
    assert payload.compute_id == compute_id
    assert payload.database_id == database_id
    assert payload.storage_id == storage_id


@pytest.mark.parametrize(
    "payload",
    [
        {"name": "", "country": "CH", "compute_id": uuid4(), "database_id": uuid4(), "storage_id": uuid4()},
        {"name": "Acme", "country": "XX", "compute_id": uuid4(), "database_id": uuid4(), "storage_id": uuid4()},
        {"name": "Acme", "country": "CH", "compute_id": "bad", "database_id": uuid4(), "storage_id": uuid4()},
    ],
)
def test_organization_create_rejects_invalid_assignment_payload(payload: dict[str, object]) -> None:
    """Reject Organization creation payloads with invalid metadata or registry IDs."""

    # Invalid Organization values fail before route-level access and service checks.
    with pytest.raises(ValidationError):
        OrganizationCreate.model_validate(payload)


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
