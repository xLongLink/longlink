import pytest
from src.utils import mail
from email.message import EmailMessage
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


async def test_send_mail_delivers_multipart_message_with_configured_smtp(monkeypatch: pytest.MonkeyPatch) -> None:
    """Deliver HTML mail through the configured SMTP transport."""

    # Arrange
    sent: list[tuple[EmailMessage, dict[str, object]]] = []

    async def capture(message: EmailMessage, **options: object) -> None:
        """Capture the SMTP message and its delivery configuration."""

        sent.append((message, options))

    monkeypatch.setattr(env, "DEVELOPMENT", False)
    monkeypatch.setattr(env, "SMTP_HOST", "smtp.example.com")
    monkeypatch.setattr(env, "SMTP_PORT", 465)
    monkeypatch.setattr(env, "SMTP_USERNAME", "mailer@example.com")
    monkeypatch.setattr(env, "SMTP_PASSWORD", "smtp-password")
    monkeypatch.setattr(env, "SMTP_USE_TLS", True)
    monkeypatch.setattr(env, "SMTP_START_TLS", False)
    monkeypatch.setattr(mail.aiosmtplib, "send", capture)

    # Act
    await mail.send_mail("user@example.com", "Welcome", "Plain message", "<p>HTML message</p>")

    # Assert
    assert len(sent) == 1
    message, options = sent[0]
    assert message["From"] == "LongLink <mailer@example.com>"
    assert message["To"] == "user@example.com"
    assert message["Subject"] == "Welcome"
    plain_body = message.get_body(("plain",))
    html_body = message.get_body(("html",))
    assert plain_body is not None
    assert html_body is not None
    assert plain_body.get_content() == "Plain message\n"
    assert html_body.get_content() == "<p>HTML message</p>\n"
    assert options == {
        "hostname": "smtp.example.com",
        "port": 465,
        "username": "mailer@example.com",
        "password": "smtp-password",
        "use_tls": True,
        "start_tls": False,
        "timeout": 15,
    }
