import pytest
from src.utils import mail
from email.message import EmailMessage
from src.environments import env
from src.models.roles import OrganizationRoles

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


async def test_send_mail_requires_smtp_outside_development(monkeypatch: pytest.MonkeyPatch) -> None:
    """Reject delivery when SMTP is absent outside local development."""

    # Arrange
    monkeypatch.setattr(env, "DEVELOPMENT", False)
    monkeypatch.setattr(env, "SMTP_HOST", None)

    # Act and assert
    with pytest.raises(RuntimeError, match="SMTP_HOST is not configured"):
        await mail.send_mail("user@example.com", "Welcome", "Plain message", "<p>HTML message</p>")


async def test_password_reset_email_keeps_credential_in_url_fragment(monkeypatch: pytest.MonkeyPatch) -> None:
    """Build reset links with an encoded credential outside the HTTP request path."""

    # Arrange
    rendered: list[tuple[str, dict[str, object]]] = []
    sent: list[tuple[str, str, str, str]] = []

    def render(template_name: str, **context: object) -> str:
        """Capture the reset template context."""

        rendered.append((template_name, context))
        return "<p>Reset</p>"

    async def send(recipient: str, subject: str, text: str, html: str) -> None:
        """Capture the completed reset email."""

        sent.append((recipient, subject, text, html))

    monkeypatch.setattr(env, "PUBLIC_URL", "https://longlink.dev/")
    monkeypatch.setattr(mail, "render_mjml_template", render)
    monkeypatch.setattr(mail, "send_mail", send)

    # Act
    await mail.send_password_reset_email("user@example.com", "token with spaces")

    # Assert
    reset_url = "https://longlink.dev/auth/reset-password#token=token+with+spaces"
    assert rendered == [("password_reset.mjml", {"reset_url": reset_url})]
    assert sent == [("user@example.com", "Reset your LongLink password", f"Reset your password:\n\n{reset_url}\n", "<p>Reset</p>")]


async def test_organization_invitation_email_prefills_the_recipient(monkeypatch: pytest.MonkeyPatch) -> None:
    """Build invitation links from the recipient address and membership role."""

    # Arrange
    rendered: list[tuple[str, dict[str, object]]] = []

    def render(template_name: str, **context: object) -> str:
        """Capture the invitation template context."""

        rendered.append((template_name, context))
        return "<p>Invitation</p>"

    async def send(_recipient: str, _subject: str, _text: str, _html: str) -> None:
        """Avoid SMTP delivery while testing message construction."""

    monkeypatch.setattr(env, "PUBLIC_URL", "https://longlink.dev/")
    monkeypatch.setattr(mail, "render_mjml_template", render)
    monkeypatch.setattr(mail, "send_mail", send)

    # Act
    await mail.send_organization_invitation_email("user+team@example.com", "Engineering", OrganizationRoles.maintain)

    # Assert
    assert rendered == [
        (
            "organization_invitation.mjml",
            {
                "invitation_url": "https://longlink.dev/auth/register?email=user%2Bteam%40example.com",
                "organization_name": "Engineering",
                "role_label": "maintain",
            },
        )
    ]
