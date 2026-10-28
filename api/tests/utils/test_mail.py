import pytest
from types import SimpleNamespace
from src.utils import mail
from email.message import EmailMessage
from src.environments import env
from src.models.roles import OrganizationRoles

pytestmark = pytest.mark.no_db


@pytest.fixture
def sent_mail(monkeypatch: pytest.MonkeyPatch) -> list[tuple[EmailMessage, dict[str, object]]]:
    """Capture composed messages and options at the SMTP boundary."""

    # Keep rendering and MIME composition real while preventing external delivery.
    messages: list[tuple[EmailMessage, dict[str, object]]] = []

    async def capture(message: EmailMessage, **options: object) -> None:
        """Record the SMTP message and its delivery configuration."""

        messages.append((message, options))

    monkeypatch.setattr(mail.aiosmtplib, "send", capture)
    return messages


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
        "organization_invitation.mjml", invitation_url=invitation_url, organization_name=organization_name, role_label=role_label
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
        # Implicit TLS disables STARTTLS negotiation.
        pytest.param("tls", True, False, id="tls"),
    ],
)
async def test_send_mail_delivers_multipart_message_with_configured_smtp(
    monkeypatch: pytest.MonkeyPatch, sent_mail: list[tuple[EmailMessage, dict[str, object]]], transport: str, use_tls: bool, start_tls: bool
) -> None:
    """Deliver HTML mail through the configured SMTP transport."""

    # Arrange
    monkeypatch.setattr(env, "SMTP_HOST", "smtp.example.com")
    monkeypatch.setattr(env, "SMTP_PORT", 465)
    monkeypatch.setattr(env, "SMTP_USERNAME", "mailer@example.com")
    monkeypatch.setattr(env, "SMTP_FROM", "mailer@example.com")
    monkeypatch.setattr(env, "SMTP_PASSWORD", "smtp-password")
    monkeypatch.setattr(env, "SMTP_TRANSPORT", transport)

    # Act
    await mail.send_mail("user@example.com", "Welcome", "Plain message", "<p>HTML message</p>")

    # Assert
    [(message, options)] = sent_mail
    assert message["From"] == "LongLink <mailer@example.com>"
    assert message["To"] == "user@example.com"
    assert message["Subject"] == "Welcome"
    plain_body = message.get_body(("plain",))
    html_body = message.get_body(("html",))
    assert plain_body is not None
    assert html_body is not None
    assert plain_body.get_content() == "Plain message\n"
    assert html_body.get_content() == "<p>HTML message</p>\n"

    # Verify the real SMTP configuration passed to the transport boundary.
    assert options == {
        "hostname": "smtp.example.com",
        "port": 465,
        "username": "mailer@example.com",
        "password": "smtp-password",
        "use_tls": use_tls,
        "start_tls": start_tls,
        "timeout": 15,
    }


async def test_password_reset_email_keeps_credential_in_url_fragment(
    monkeypatch: pytest.MonkeyPatch, sent_mail: list[tuple[EmailMessage, dict[str, object]]]
) -> None:
    """Build reset links with an encoded credential outside the HTTP request path."""

    # Arrange
    monkeypatch.setattr(env, "PUBLIC_URL", "https://longlink.dev")

    # Act
    await mail.send_password_reset_email("user@example.com", "token with spaces")

    # Assert
    reset_url = "https://longlink.dev/auth/reset-password#token=token+with+spaces"
    [(message, _)] = sent_mail
    assert message["To"] == "user@example.com"
    assert message["Subject"] == "Reset your LongLink password"
    plain_body = message.get_body(("plain",))
    html_body = message.get_body(("html",))
    assert plain_body is not None
    assert html_body is not None
    assert plain_body.get_content() == f"Reset your password:\n\n{reset_url}\n"
    assert f'href="{reset_url}"' in html_body.get_content()


async def test_organization_invitation_email_prefills_the_recipient(
    monkeypatch: pytest.MonkeyPatch, sent_mail: list[tuple[EmailMessage, dict[str, object]]]
) -> None:
    """Build invitation links from the recipient address and membership role."""

    # Arrange
    monkeypatch.setattr(env, "PUBLIC_URL", "https://longlink.dev")

    # Act
    await mail.send_organization_invitation_email("user+team@example.com", "Engineering", OrganizationRoles.maintain)

    # Assert
    [(message, _)] = sent_mail
    assert message["To"] == "user+team@example.com"
    assert message["Subject"] == "Invitation to join Engineering on LongLink"
    plain_body = message.get_body(("plain",))
    html_body = message.get_body(("html",))
    assert plain_body is not None
    assert html_body is not None
    text = plain_body.get_content()
    html = html_body.get_content()
    assert 'href="https://longlink.dev/login?email=user%2Bteam%40example.com"' in html

    # Both message alternatives retain the invitation context and encoded login link.
    assert "Join Engineering with maintain access." in html
    assert "https://longlink.dev/login?email=user%2Bteam%40example.com" in text
    assert "Role: maintain\n" in text
