from src.schemas.requests import TeamMemberRead, PurchaseRequestCreate


def test_purchase_request_schema_accepts_starter_payload() -> None:
    """Load the scaffolded application and validate its starter request payload."""

    # Arrange
    from main import app

    payload = {
        "title": "Laptop for field audit",
        "amount": 1800,
        "vendor": "Acme Hardware",
        "justification": "The field team needs a dedicated machine for onsite audit work.",
    }

    # Act
    request = PurchaseRequestCreate(**payload)

    # Assert
    assert app is not None
    assert request.model_dump() == payload


def test_team_member_schema_accepts_sample_directory_payload() -> None:
    """Validate the typed team payload used by the sample team tab."""

    # Arrange
    payload = {
        "id": "finance",
        "name": "Mira Tanner",
        "role": "Finance lead",
        "badge": "Approver",
        "initials": "MT",
        "avatar_url": "https://api.dicebear.com/9.x/initials/svg?seed=Mira%20Tanner",
        "escalation": "Owns requests above CHF 5,000.",
    }

    # Act
    member = TeamMemberRead(**payload)

    # Assert
    assert member.model_dump() == payload
