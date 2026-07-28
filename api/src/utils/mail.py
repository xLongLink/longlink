import logging
import aiosmtplib
from html import escape
from mjml import mjml_to_html
from string import Template
from pathlib import Path
from urllib.parse import urlencode
from email.message import EmailMessage
from src.environments import env
from src.models.roles import OrganizationRoles

logger = logging.getLogger("longlink.mail")


def render_mjml_template(template_name: str, **context: object) -> str:
    """Render one bundled MJML template to HTML."""

    # Render the MJML source with escaped string context values.
    template = Template((Path(__file__).with_name("templates") / template_name).read_text(encoding="utf-8"))
    escaped_context = {name: escape(str(value), quote=True) for name, value in context.items()}
    source = template.substitute(**escaped_context)

    # Compile the rendered MJML markup to email-safe HTML.
    result = mjml_to_html(source.encode("utf-8"))
    if result.errors:
        raise ValueError(f"Failed to render MJML template {template_name}: {result.errors}")

    return result.html


async def send_mail(recipient: str, subject: str, text: str, html: str) -> None:
    """Deliver one email or log it during local development."""

    # Keep local development self-contained when no SMTP server is configured.
    if env.SMTP_HOST is None and env.DEVELOPMENT:
        logger.warning("Development email to %s: %s\n%s", recipient, subject, text)
        return

    # Require delivery configuration outside the development logging path.
    if env.SMTP_HOST is None:
        raise RuntimeError("SMTP_HOST is not configured")

    # Build a multipart email with an HTML body and plain-text fallback.
    message = EmailMessage()
    message["From"] = f"LongLink <{env.SMTP_USERNAME}>"
    message["To"] = recipient
    message["Subject"] = subject
    message.set_content(text)
    message.add_alternative(html, subtype="html")

    # Deliver through an asynchronous SMTP connection with explicit transport selection.
    await aiosmtplib.send(
        message,
        hostname=env.SMTP_HOST,
        port=env.SMTP_PORT,
        username=env.SMTP_USERNAME,
        password=env.SMTP_PASSWORD,
        use_tls=env.SMTP_USE_TLS,
        start_tls=env.SMTP_START_TLS,
        timeout=15,
    )


async def send_password_reset_email(recipient: str, credential: str) -> None:
    """Deliver one password-reset link email."""

    # Keep bearer proof in the fragment so it is not sent in the initial HTTP request.
    fragment = urlencode({"token": credential})
    reset_url = f"{env.PUBLIC_URL.rstrip('/')}/auth/reset-password#{fragment}"
    subject = "Reset your LongLink password"
    text = f"Reset your password:\n\n{reset_url}\n"
    html = render_mjml_template("password_reset.mjml", reset_url=reset_url)
    await send_mail(recipient, subject, text, html)


async def send_organization_invitation_email(recipient: str, organization_name: str, role: OrganizationRoles) -> None:
    """Deliver one organization invitation email."""

    # Prefill the shared registration flow while retaining the sign-in option for existing accounts.
    subject = f"Invitation to join {organization_name} on LongLink"
    invitation_url = f"{env.PUBLIC_URL.rstrip('/')}/auth/register?{urlencode({'email': recipient})}"
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
        "organization_invitation.mjml",
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
        "signup_verification.mjml",
        verification_url=verification_url,
    )

    await send_mail(recipient, subject, text, html)
