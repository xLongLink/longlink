import pytest
from types import SimpleNamespace
from src.utils import mail
from email.message import EmailMessage
from src.environments import env
from src.models.roles import OrganizationRoles

pytestmark = pytest.mark.no_db


def test_render_mjml_template_rejects_compilation_errors(monkeypatch: pytest.MonkeyPatch) -> None:
    """Expose MJML compiler errors instead of delivering incomplete email HTML."""

    # Arrange
    monkeypatch.setattr(mail, "mjml_to_html", lambda _source: SimpleNamespace(errors=["invalid markup"]))

    # Act and assert
    with pytest.raises(ValueError, match=r"Failed to render MJML template password_reset.mjml: \['invalid markup'\]"):
        mail.render_mjml_template("password_reset.mjml", reset_url="https://example.com/reset")


def test_render_mjml_template_preserves_escaped_context_in_html() -> None:
    """Keep hostile text and link attributes safely escaped in compiled email HTML."""

    # Arrange
    organization_name = "<Acme & Sons>"
    role_label = 'owner "admin"'
    invitation_url = 'https://example.test/invite?name="quoted"&next=<unsafe>'

    # Act
    rendered = mail.render_mjml_template(
        "organization_invitation.mjml",
        invitation_url=invitation_url,
        organization_name=organization_name,
        role_label=role_label,
    )

    # Assert
    assert organization_name not in rendered
    assert invitation_url not in rendered
    assert 'Join &lt;Acme &amp; Sons&gt; with owner "admin" access.' in rendered
    assert "href='https://example.test/invite?name=\"quoted\"&amp;next=&lt;unsafe&gt;'" in rendered


@pytest.mark.parametrize(
    ("transport", "use_tls", "start_tls"),
    [
        pytest.param("plain", False, False, id="plain"),
        pytest.param("starttls", False, True, id="starttls"),
        pytest.param("tls", True, False, id="tls"),
    ],
)
async def test_send_mail_delivers_multipart_message_with_configured_smtp(
    monkeypatch: pytest.MonkeyPatch, transport: str, use_tls: bool, start_tls: bool
) -> None:
    """Deliver HTML mail through the configured SMTP transport."""

    # Arrange
    sent: list[tuple[EmailMessage, dict[str, object]]] = []

    async def capture(message: EmailMessage, **options: object) -> None:
        """Capture the SMTP message and its delivery configuration."""

        sent.append((message, options))

    monkeypatch.setattr(env, "SMTP_HOST", "smtp.example.com")
    monkeypatch.setattr(env, "SMTP_PORT", 465)
    monkeypatch.setattr(env, "SMTP_USERNAME", "mailer@example.com")
    monkeypatch.setattr(env, "SMTP_FROM", "mailer@example.com")
    monkeypatch.setattr(env, "SMTP_PASSWORD", "smtp-password")
    monkeypatch.setattr(env, "SMTP_TRANSPORT", transport)
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
        "use_tls": use_tls,
        "start_tls": start_tls,
        "timeout": 15,
    }


async def test_send_mail_requires_smtp(monkeypatch: pytest.MonkeyPatch) -> None:
    """Reject delivery when SMTP is absent."""

    # Arrange
    monkeypatch.setattr(env, "SMTP_HOST", None)

    # Act and assert
    with pytest.raises(RuntimeError, match="SMTP_HOST is not configured"):
        await mail.send_mail("user@example.com", "Welcome", "Plain message", "<p>HTML message</p>")


async def test_password_reset_email_keeps_credential_in_url_fragment(
    monkeypatch: pytest.MonkeyPatch, captured_mail: list[tuple[str, str, str, str | None]]
) -> None:
    """Build reset links with an encoded credential outside the HTTP request path."""

    # Arrange
    monkeypatch.setattr(env, "PUBLIC_URL", "https://longlink.dev")

    # Act
    await mail.send_password_reset_email("user@example.com", "token with spaces")

    # Assert
    reset_url = "https://longlink.dev/auth/reset-password#token=token+with+spaces"
    assert len(captured_mail) == 1
    recipient, subject, text, html = captured_mail[0]
    assert recipient == "user@example.com"
    assert subject == "Reset your LongLink password"
    assert text == f"Reset your password:\n\n{reset_url}\n"
    assert html is not None
    assert f'href="{reset_url}"' in html


async def test_organization_invitation_email_prefills_the_recipient(
    monkeypatch: pytest.MonkeyPatch, captured_mail: list[tuple[str, str, str, str | None]]
) -> None:
    """Build invitation links from the recipient address and membership role."""

    # Arrange
    monkeypatch.setattr(env, "PUBLIC_URL", "https://longlink.dev")

    # Act
    await mail.send_organization_invitation_email("user+team@example.com", "Engineering", OrganizationRoles.maintain)

    # Assert
    assert len(captured_mail) == 1
    recipient, subject, text, html = captured_mail[0]
    assert recipient == "user+team@example.com"
    assert subject == "Invitation to join Engineering on LongLink"
    assert html is not None
    assert 'href="https://longlink.dev/auth/register?email=user%2Bteam%40example.com"' in html
    assert "Join Engineering with maintain access." in html
    assert "https://longlink.dev/auth/register?email=user%2Bteam%40example.com" in text
    assert "Role: maintain\n" in text
