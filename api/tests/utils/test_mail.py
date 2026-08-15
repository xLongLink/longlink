import pytest
import logging
from src.utils import mail
from src.environments import env

pytestmark = pytest.mark.no_db


async def test_development_mail_logging_excludes_message_body(monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture) -> None:
    """Log development mail metadata without exposing bearer credentials."""

    # Arrange
    token = "sensitive-reset-token"
    monkeypatch.setattr(env, "DEVELOPMENT", True)
    monkeypatch.setattr(env, "SMTP_HOST", None)
    caplog.set_level(logging.WARNING, logger="longlink.mail")

    # Act
    await mail.send_mail("user@example.com", "Reset your password", f"https://example.test/reset#{token}", "<p>message</p>")

    # Assert
    assert caplog.messages == ["Development email to user@example.com: Reset your password"]
    assert token not in caplog.text
