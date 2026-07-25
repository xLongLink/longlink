import asyncio
import logging
import smtplib
from html import escape
from mjml import mjml_to_html
from string import Template
from pathlib import Path
from urllib.parse import urlencode
from email.message import EmailMessage
from src.environments import env
from src.models.roles import OrganizationRoles

logger = logging.getLogger("longlink.mail")
TEMPLATES = Path(__file__).with_name("templates")
ORGANIZATION_INVITATION_TEMPLATE = "organization_invitation.mjml"
SIGNUP_VERIFICATION_TEMPLATE = "signup_verification.mjml"


def sender_address() -> str:
    """Return the configured email sender header value."""

    # Prefer an explicit sender override for providers with non-email SMTP usernames.
    if env.SMTP_FROM is not None:
        return env.SMTP_FROM

    # Use the SMTP username as the sender address for mailbox-based SMTP providers.
    if env.SMTP_USERNAME is not None:
        return f"LongLink <{env.SMTP_USERNAME}>"

    # Keep development logging and unauthenticated SMTP usable without a configured mailbox.
    return "LongLink <no-reply@longlink.dev>"


def render_mjml_template(template_name: str, **context: object) -> str:
    """Render one bundled MJML template to HTML."""

    # Render the MJML source with escaped string context values.
    template = Template((TEMPLATES / template_name).read_text(encoding="utf-8"))
    escaped_context = {name: escape(str(value), quote=True) for name, value in context.items()}
    source = template.substitute(**escaped_context)

    # Compile the rendered MJML markup to email-safe HTML.
    result = mjml_to_html(source.encode("utf-8"))
    if result.errors:
        raise ValueError(f"Failed to render MJML template {template_name}: {result.errors}")

    return result.html


def send_smtp_message(message: EmailMessage) -> None:
    """Send one prepared message through configured SMTP."""

    # Require delivery configuration outside the development logging path.
    if env.SMTP_HOST is None:
        raise RuntimeError("SMTP_HOST is not configured")

    # Open the configured SMTP transport and upgrade it with STARTTLS when requested.
    smtp_type = smtplib.SMTP_SSL if env.SMTP_USE_TLS else smtplib.SMTP
    with smtp_type(env.SMTP_HOST, env.SMTP_PORT, timeout=15) as client:
        if env.SMTP_START_TLS:
            client.starttls()
        if env.SMTP_USERNAME is not None:
            client.login(env.SMTP_USERNAME, env.SMTP_PASSWORD or "")
        client.send_message(message)


async def send_mail(recipient: str, subject: str, text: str, html: str | None = None) -> None:
    """Deliver one email or log it during local development."""

    # Keep local development self-contained when no SMTP server is configured.
    if env.SMTP_HOST is None and env.DEVELOPMENT:
        logger.warning("Development email to %s: %s\n%s", recipient, subject, text)
        return

    # Build a multipart email when HTML is available and always keep a plain-text fallback.
    message = EmailMessage()
    message["From"] = sender_address()
    message["To"] = recipient
    message["Subject"] = subject
    message.set_content(text)
    if html is not None:
        message.add_alternative(html, subtype="html")

    # SMTP is synchronous, so isolate it from the API event loop.
    await asyncio.to_thread(send_smtp_message, message)


async def send_authentication_email(recipient: str, subject: str, body: str) -> None:
    """Deliver one plain authentication email."""

    # Password reset emails still use the generic plain-text delivery path.
    await send_mail(recipient, subject, body)


async def send_organization_invitation_email(recipient: str, organization_name: str, role: OrganizationRoles) -> None:
    """Deliver one organization invitation email."""

    # Prefill the shared registration flow while retaining the sign-in option for existing accounts.
    subject = f"Invitation to join {organization_name} on LongLink"
    invitation_url = f"{env.PUBLIC_URL.rstrip('/')}/auth/register?{urlencode({'email': recipient, 'next': '/organizations'})}"
    role_label = role.value

    # Keep a plain-text fallback for clients that do not render HTML.
    text = (
        f"You have been invited to join {organization_name} on LongLink.\n\n"
        f"Role: {role_label}\n\n"
        f"Sign in or create an account with this email address to continue: {invitation_url}\n\n"
        "If you were not expecting this invitation, you can ignore this email.\n\n"
        "GitHub: https://github.com/xLongLink/longlink\n"
        "LinkedIn: https://www.linkedin.com/company/longlink\n"
        "Contact: info@longlink.dev\n"
    )
    html = render_mjml_template(
        ORGANIZATION_INVITATION_TEMPLATE,
        invitation_url=invitation_url,
        organization_name=organization_name,
        role_label=role_label,
    )

    await send_mail(recipient, subject, text, html)


async def send_signup_verification_email(recipient: str, token: str) -> None:
    """Deliver the sign-up verification link email."""

    # Render the responsive MJML body while preserving a plain-text fallback for all clients.
    subject = "Welcome to LongLink"
    verification_url = f"{env.PUBLIC_URL.rstrip('/')}/auth/verify-email#{urlencode({'token': token})}"
    text = (
        "Welcome to LongLink.\n\n"
        "Please confirm your email address to continue account setup.\n\n"
        f"Continue account setup: {verification_url}\n\n"
        "If you did not sign up for LongLink, you can ignore this email.\n\n"
        "GitHub: https://github.com/xLongLink/longlink\n"
        "LinkedIn: https://www.linkedin.com/company/longlink\n"
        "Contact: info@longlink.dev\n"
    )
    html = render_mjml_template(
        SIGNUP_VERIFICATION_TEMPLATE,
        verification_url=verification_url,
    )

    await send_mail(recipient, subject, text, html)
