from unittest.mock import AsyncMock, Mock

from src.constants import MAIL_TEMPLATES
from src.environments import env
import src.utils.mail as mail


def test_is_email_enabled_requires_switch_host_and_address(monkeypatch) -> None:
    """Email should require the enabling flag plus host and sender address."""

    monkeypatch.setattr(env, "EMAIL_ENABLED", True)
    monkeypatch.setattr(env, "EMAIL_SMTP_HOST", "smtp.example.com")
    monkeypatch.setattr(env, "EMAIL_FROM_ADDRESS", "no-reply@example.com")
    assert mail.is_email_enabled()

    monkeypatch.setattr(env, "EMAIL_SMTP_HOST", "")
    assert not mail.is_email_enabled()

    monkeypatch.setattr(env, "EMAIL_SMTP_HOST", "smtp.example.com")
    monkeypatch.setattr(env, "EMAIL_FROM_ADDRESS", "")
    assert not mail.is_email_enabled()

    monkeypatch.setattr(env, "EMAIL_ENABLED", False)
    assert not mail.is_email_enabled()


async def test_send_templated_email_skips_when_disabled(monkeypatch) -> None:
    """Skip template rendering and SMTP send when email is disabled."""

    monkeypatch.setattr(env, "EMAIL_ENABLED", False)
    monkeypatch.setattr(env, "EMAIL_SMTP_HOST", "smtp.example.com")
    monkeypatch.setattr(env, "EMAIL_FROM_ADDRESS", "no-reply@example.com")

    render_mock = Mock(return_value="<html/>")
    send_mock = Mock()
    monkeypatch.setattr("src.utils.mail.render_mjml_template", render_mock)
    monkeypatch.setattr("src.utils.mail._send_message", send_mock)

    await mail.send_templated_email(
        recipient_email="invited@example.com",
        subject="Test subject",
        mjml_template="organization_invitation.mjml",
    )

    assert render_mock.call_count == 0
    assert send_mock.call_count == 0


async def test_send_templated_email_renders_and_dispatches(monkeypatch) -> None:
    """Build and dispatch a multipart message when email settings are enabled."""

    monkeypatch.setattr(env, "EMAIL_ENABLED", True)
    monkeypatch.setattr(env, "EMAIL_SMTP_HOST", "smtp.example.com")
    monkeypatch.setattr(env, "EMAIL_SMTP_PORT", 587)
    monkeypatch.setattr(env, "EMAIL_FROM_ADDRESS", "no-reply@example.com")
    monkeypatch.setattr(env, "EMAIL_FROM_NAME", "LongLink")
    monkeypatch.setattr(env, "EMAIL_SMTP_TIMEOUT_SECONDS", 10)

    render_mock = Mock(return_value="<html><p>Hello</p></html>")
    send_mock = Mock()
    monkeypatch.setattr("src.utils.mail.render_mjml_template", render_mock)
    monkeypatch.setattr("src.utils.mail._send_message", send_mock)

    await mail.send_templated_email(
        recipient_email="invited@example.com",
        subject="Test subject",
        mjml_template="organization_invitation.mjml",
    )

    assert render_mock.call_count == 1
    assert send_mock.call_count == 1
    message = send_mock.call_args.args[0]
    assert message["To"] == "invited@example.com"
    assert message["Subject"] == "Test subject"
    assert message.get_body(preferencelist=["html"]).get_content().startswith("<html><p>Hello</p></html>")


async def test_send_organization_invitation_email_builds_expected_context(monkeypatch) -> None:
    """Use the dedicated subject and template when dispatching invitation email."""

    send_templated = AsyncMock()
    monkeypatch.setattr("src.utils.mail.send_templated_email", send_templated)

    await mail.send_organization_invitation_email(
        recipient_email="invitee@example.com",
        inviter_name="Alice",
        organization_name="Acme",
        organization_id="0001",
        invitation_role="admin",
    )

    send_templated.assert_awaited_once_with(
        recipient_email="invitee@example.com",
        subject="You are invited to Acme",
        mjml_template=MAIL_TEMPLATES / "organization_invitation.mjml",
        text_template=MAIL_TEMPLATES / "organization_invitation.txt",
        context={
            "recipient_email": "invitee@example.com",
            "inviter_name": "Alice",
            "organization_name": "Acme",
            "invitation_role": "admin",
            "organization_id": "0001",
        },
    )
