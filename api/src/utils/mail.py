"""Email utility helpers built on MJML templates and SMTP delivery."""

# This module is intentionally kept as the single mail implementation point even
# while runtime flows do not call it yet, so it should not be removed as dead code.

from __future__ import annotations

import asyncio
import subprocess
from email.message import EmailMessage
from email.utils import formataddr
from pathlib import Path
from string import Template
from smtplib import SMTP, SMTP_SSL
from ssl import create_default_context
from typing import Any
from collections.abc import Mapping

from src.constants import MAIL_TEMPLATES
from src.environments import env
from src.logger import logger


class MailTemplateError(RuntimeError):
    """Raised when MJML rendering fails."""


class MailDeliveryError(RuntimeError):
    """Raised when SMTP delivery fails."""


def is_email_enabled() -> bool:
    """Return true when email settings are complete enough to send mail."""

    return bool(
        env.EMAIL_ENABLED
        and env.EMAIL_SMTP_HOST
        and env.EMAIL_FROM_ADDRESS
    )


def _normalize_context(context: Mapping[str, object] | None = None) -> dict[str, object]:
    """Convert optional template context into a mutable mapping."""

    return dict(context or {})


def _render_template(template_path: str | Path, context: Mapping[str, object] | None = None) -> str:
    """Render one text template with safe placeholder substitution."""

    content = Path(template_path).read_text(encoding="utf-8")
    return Template(content).safe_substitute(_normalize_context(context))


def render_mjml(mjml_content: str) -> str:
    """Compile MJML markup to HTML using the configured MJML CLI."""

    command = env.EMAIL_MJML_COMMAND
    if command is None:
        raise MailTemplateError("EMAIL_MJML_COMMAND is not set")

    command = command.strip()

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
        return formataddr((sender_name, env.EMAIL_FROM_ADDRESS))

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

    if env.EMAIL_SMTP_HOST is None:
        raise MailDeliveryError("EMAIL_SMTP_HOST is required before sending mail")

    if env.EMAIL_SMTP_PORT is None:
        raise MailDeliveryError("EMAIL_SMTP_PORT is required before sending mail")

    timeout = env.EMAIL_SMTP_TIMEOUT_SECONDS
    ssl_context = create_default_context()

    if env.EMAIL_SMTP_USE_SSL:
        with SMTP_SSL(env.EMAIL_SMTP_HOST, env.EMAIL_SMTP_PORT, timeout=timeout, context=ssl_context) as client:
            _authenticate_client(client)
            client.send_message(message)
        return

    with SMTP(env.EMAIL_SMTP_HOST, env.EMAIL_SMTP_PORT, timeout=timeout) as client:
        if env.EMAIL_SMTP_USE_TLS:
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


def _build_invitation_context(
    recipient_email: str,
    inviter_name: str,
    organization_name: str,
    invitation_role: str,
    organization_id: str,
) -> dict[str, Any]:
    """Build context keys expected by the organization invitation templates."""

    return {
        "recipient_email": recipient_email,
        "inviter_name": inviter_name,
        "organization_name": organization_name,
        "invitation_role": invitation_role,
        "organization_id": organization_id,
    }


async def send_organization_invitation_email(
    recipient_email: str,
    inviter_name: str,
    organization_name: str,
    organization_id: str,
    invitation_role: str,
) -> None:
    """Send a ready-to-use organization invitation message."""

    context = _build_invitation_context(recipient_email, inviter_name, organization_name, invitation_role, organization_id)
    await send_templated_email(
        recipient_email=recipient_email,
        subject=f"You are invited to {organization_name}",
        mjml_template=MAIL_TEMPLATES / "organization_invitation.mjml",
        text_template=MAIL_TEMPLATES / "organization_invitation.txt",
        context=context,
    )
