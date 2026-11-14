import os
import pytest
import secrets

TEST_PASSWORD = secrets.token_urlsafe(32)


@pytest.hookimpl(tryfirst=True)
def pytest_load_initial_conftests() -> None:
    """Configure isolated test settings before importing application fixtures."""

    # Seed required settings and prevent workstation credentials from enabling optional providers.
    os.environ.update(
        {
            "SMTP_HOST": "smtp.example.com",
            "PUBLIC_URL": "http://localhost:5173",
            "SESSION_KEY": "test-session-key-that-is-long-enough",
            "DATABASE_URL": "sqlite+aiosqlite:///./dev.db",
            "ADMIN_EMAIL": "test-administrator@example.com",
            "ADMIN_PASSWORD": TEST_PASSWORD,
            "ENCRYPTION_KEY": "longlink-test-encryption-key-that-is-long-enough",
            "SMTP_PORT": "587",
            "SMTP_TRANSPORT": "starttls",
            "SMTP_PASSWORD": "null",
            "SMTP_USERNAME": "null",
            "GITHUB_OAUTH_CLIENT_ID": "null",
            "GOOGLE_OAUTH_CLIENT_ID": "null",
            "GITHUB_OAUTH_CLIENT_SECRET": "null",
            "GOOGLE_OAUTH_CLIENT_SECRET": "null",
        }
    )
