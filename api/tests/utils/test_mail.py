import pytest
from src.utils import mail
from src.environments import env

pytestmark = pytest.mark.no_db


async def test_development_mail_logging_excludes_message_body(monkeypatch: pytest.MonkeyPatch) -> None:
    """Log development mail metadata without exposing bearer credentials."""

    # Arrange
    token = "sensitive-reset-token"
    logged: list[tuple[str, tuple[object, ...]]] = []

    def capture(message: str, *args: object) -> None:
        """Capture the development-only mail log record."""

        logged.append((message, args))

    monkeypatch.setattr(env, "DEVELOPMENT", True)
    monkeypatch.setattr(env, "SMTP_HOST", None)
    monkeypatch.setattr(mail.logger, "warning", capture)

    # Act
    await mail.send_mail("user@example.com", "Reset your password", f"https://example.test/reset#{token}", "<p>message</p>")

    # Assert
    assert logged == [("Development email to %s: %s", ("user@example.com", "Reset your password"))]
    assert token not in str(logged)
