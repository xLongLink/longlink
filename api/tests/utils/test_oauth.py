import pytest
from src.utils import oauth

pytestmark = pytest.mark.no_db


def test_google_identity_accepts_verified_profile() -> None:
    """Return a verified identity for a complete Google userinfo response."""

    # Arrange
    payload = {
        "email_verified": True,
        "sub": "google-subject-1",
        "email": "user@example.com",
        "name": "Example User",
        "picture": "https://example.com/avatar.png",
    }

    # Act
    result = oauth._google_identity(payload)

    # Assert
    assert result is not None
    assert result.subject == "google-subject-1"
    assert str(result.email) == "user@example.com"
    assert result.name == "Example User"
    assert result.avatar == "https://example.com/avatar.png"


@pytest.mark.parametrize(
    "payload",
    [
        {"sub": "google-subject-1", "email": "user@example.com", "email_verified": False},
        {"sub": "google-subject-1", "email": "user@example.com"},
        [],
        None,
    ],
)
def test_google_identity_rejects_unverified_or_malformed_payload(payload: object) -> None:
    """Reject Google profiles that do not prove email ownership."""

    # Act
    result = oauth._google_identity(payload)

    # Assert
    assert result is None


def test_google_identity_rejects_invalid_email() -> None:
    """Reject Google profiles with an unusable email address."""

    # Arrange
    payload = {"email_verified": True, "sub": "google-subject-1", "email": "not-an-email"}

    # Act
    result = oauth._google_identity(payload)

    # Assert
    assert result is None


def test_google_identity_rejects_oversized_subject() -> None:
    """Reject Google subjects that cannot fit the persisted identity."""

    # Arrange
    payload = {"email_verified": True, "sub": "s" * 256, "email": "user@example.com"}

    # Act
    result = oauth._google_identity(payload)

    # Assert
    assert result is None


def test_google_identity_falls_back_to_email_local_part() -> None:
    """Derive a usable profile name when Google omits display names."""

    # Arrange
    payload = {"email_verified": True, "sub": "google-subject-1", "email": "fallback@example.com"}

    # Act
    result = oauth._google_identity(payload)

    # Assert
    assert result is not None
    assert result.name == "fallback"


def test_github_identity_selects_primary_verified_email() -> None:
    """Return the primary verified GitHub email among several candidates."""

    # Arrange
    profile = {"id": 123456, "login": "octocat"}
    emails = [
        {"email": "secondary@example.com", "primary": False, "verified": True},
        {"email": "unverified@example.com", "primary": True, "verified": False},
        {"email": "primary@example.com", "primary": True, "verified": True},
    ]

    # Act
    result = oauth._github_identity(profile, emails)

    # Assert
    assert result is not None
    assert result.subject == "123456"
    assert str(result.email) == "primary@example.com"
    assert result.name == "octocat"


@pytest.mark.parametrize("raw_subject", [True, False, "123456", None])
def test_github_identity_rejects_non_integer_subject(raw_subject: object) -> None:
    """Reject GitHub profiles whose numeric subject could collide or be forged."""

    # Arrange
    profile = {"id": raw_subject, "login": "octocat"}
    emails = [{"email": "primary@example.com", "primary": True, "verified": True}]

    # Act
    result = oauth._github_identity(profile, emails)

    # Assert
    assert result is None


def test_github_identity_rejects_without_primary_verified_email() -> None:
    """Reject GitHub responses with no primary verified email address."""

    # Arrange
    profile = {"id": 123456, "login": "octocat"}
    emails = [{"email": "secondary@example.com", "primary": False, "verified": True}]

    # Act
    result = oauth._github_identity(profile, emails)

    # Assert
    assert result is None


def test_github_identity_rejects_invalid_primary_email() -> None:
    """Reject GitHub email entries that fail canonical email validation."""

    # Arrange
    profile = {"id": 123456, "login": "octocat"}
    emails = [{"email": "not-an-email", "primary": True, "verified": True}]

    # Act
    result = oauth._github_identity(profile, emails)

    # Assert
    assert result is None
