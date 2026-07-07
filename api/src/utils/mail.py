# This module is intentionally kept as the single mail implementation point even
# while runtime flows do not call it yet, so it should not be removed as dead code.

from __future__ import annotations

import ssl
import asyncio
import subprocess
import email.utils
from string import Template
from pathlib import Path
from smtplib import SMTP, SMTP_SSL
from src.logger import logger
from email.message import EmailMessage
from src.constants import MAIL_TEMPLATES
from collections.abc import Mapping
from src.environments import env


class MailTemplateError(RuntimeError):
    """Raised when MJML rendering fails."""


class MailDeliveryError(RuntimeError):
    """Raised when SMTP delivery fails."""


def is_email_enabled() -> bool:
    """Return true when email settings are complete enough to send mail."""

    return bool(env.EMAIL_ENABLED and env.EMAIL_SMTP_HOST and env.EMAIL_FROM_ADDRESS)


def _render_template(template_path: str | Path, context: Mapping[str, object] | None = None) -> str:
    """Render one text template with safe placeholder substitution."""

    content = Path(template_path).read_text(encoding="utf-8")
    return Template(content).safe_substitute(dict(context or {}))


def render_mjml(mjml_content: str) -> str:
    """Compile MJML markup to HTML using the configured MJML CLI."""

    command = (env.EMAIL_MJML_COMMAND or "").strip()
    if not command:
        raise MailTemplateError("EMAIL_MJML_COMMAND is not set")

    try:
        result = subprocess.run(
            [command, "-s"],
            input=mjml_content,
            text=True,
            capture_output=True,
            check=False,
        )
    except FileNotFoundError as exc:
        raise MailTemplateError(
            f"MJML command '{command}' is not available. Install '@mjml/cli' and set EMAIL_MJML_COMMAND accordingly."
        ) from exc

    if result.returncode != 0:
        raise MailTemplateError(
            f"MJML rendering failed ({result.returncode}): {result.stderr.strip() or 'unknown error'}"
        )

    if not result.stdout.strip():
        raise MailTemplateError("MJML rendering returned an empty payload")

    return result.stdout


def render_mjml_template(template_path: str | Path, context: Mapping[str, object] | None = None) -> str:
    """Render a template file to MJML and compile it to HTML."""

    return render_mjml(_render_template(template_path, context))


def _format_sender(sender_name: str | None) -> str:
    """Build a sender address with optional display name."""

    if env.EMAIL_FROM_ADDRESS is None:
        raise MailDeliveryError("EMAIL_FROM_ADDRESS is required before sending mail")

    if sender_name is None:
        sender_name = env.EMAIL_FROM_NAME

    if sender_name:
        return email.utils.formataddr((sender_name, env.EMAIL_FROM_ADDRESS))

    return env.EMAIL_FROM_ADDRESS


def build_message(
    recipient_email: str,
    subject: str,
    html_body: str,
    text_body: str | None = None,
    sender_name: str | None = None,
) -> EmailMessage:
    """Build one multipart email with HTML and optional text fallback."""

    message = EmailMessage()
    message["From"] = _format_sender(sender_name)
    message["To"] = recipient_email
    message["Subject"] = subject
    message.set_content(text_body or "This message requires an HTML-capable email client.")
    message.add_alternative(html_body, subtype="html")
    return message


def _authenticate_client(client: SMTP | SMTP_SSL) -> None:
    """Authenticate SMTP client if credentials are both configured."""

    username = env.EMAIL_SMTP_USERNAME
    password = env.EMAIL_SMTP_PASSWORD

    if username is None and password is None:
        return

    if username is None or password is None:
        raise MailDeliveryError("SMTP username and password must be configured together")

    client.login(username, password)


def _send_message(message: EmailMessage) -> None:
    """Send one prepared email message over SMTP."""

    smtp_host = env.EMAIL_SMTP_HOST
    if smtp_host is None:
        raise MailDeliveryError("EMAIL_SMTP_HOST is required before sending mail")

    smtp_port = env.EMAIL_SMTP_PORT
    if smtp_port is None:
        raise MailDeliveryError("EMAIL_SMTP_PORT is required before sending mail")

    timeout = float(env.EMAIL_SMTP_TIMEOUT_SECONDS) if env.EMAIL_SMTP_TIMEOUT_SECONDS is not None else None
    ssl_context = ssl.create_default_context()

    if env.EMAIL_SMTP_USE_SSL:
        if timeout is None:
            smtp_client = SMTP_SSL(smtp_host, smtp_port, context=ssl_context)
        else:
            smtp_client = SMTP_SSL(smtp_host, smtp_port, timeout=timeout, context=ssl_context)
    elif timeout is None:
        smtp_client = SMTP(smtp_host, smtp_port)
    else:
        smtp_client = SMTP(smtp_host, smtp_port, timeout=timeout)

    with smtp_client as client:
        if env.EMAIL_SMTP_USE_TLS and not env.EMAIL_SMTP_USE_SSL:
            client.starttls(context=ssl_context)
        _authenticate_client(client)
        client.send_message(message)


async def send_templated_email(
    *,
    recipient_email: str,
    subject: str,
    mjml_template: str | Path,
    context: Mapping[str, object] | None = None,
    text_template: str | Path | None = None,
    sender_name: str | None = None,
) -> None:
    """Render templates and send one email, honoring the EMAIL_ENABLED switch."""

    if not is_email_enabled():
        logger.debug("Email sending disabled: set EMAIL_ENABLED=true and SMTP settings to enable")
        return

    html_body = render_mjml_template(mjml_template, context)
    text_body = _render_template(text_template, context) if text_template is not None else None
    message = build_message(
        recipient_email=recipient_email,
        subject=subject,
        html_body=html_body,
        text_body=text_body,
        sender_name=sender_name,
    )
    await asyncio.to_thread(_send_message, message)


async def send_organization_invitation_email(
    recipient_email: str,
    inviter_name: str,
    organization_name: str,
    organization_id: str,
    invitation_role: str,
) -> None:
    """Send a ready-to-use organization invitation message."""

    context = {
        "recipient_email": recipient_email,
        "inviter_name": inviter_name,
        "organization_name": organization_name,
        "invitation_role": invitation_role,
        "organization_id": organization_id,
    }
    await send_templated_email(
        recipient_email=recipient_email,
        subject=f"You are invited to {organization_name}",
        mjml_template=MAIL_TEMPLATES / "organization_invitation.mjml",
        text_template=MAIL_TEMPLATES / "organization_invitation.txt",
        context=context,
    )
