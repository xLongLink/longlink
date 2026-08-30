import jwt
from uuid import UUID
from datetime import UTC, datetime, timedelta

IDENTITY_TOKEN_ALGORITHM = "HS256"
IDENTITY_TOKEN_AUDIENCE = "longlink:identity"
IDENTITY_TOKEN_LIFETIME_SECONDS = 300


def create_identity_token(user_id: UUID, secret: str) -> str:
    """Create one short-lived Platform identity assertion for an Application request."""

    # Bind the assertion to one user and a fixed runtime-only token purpose.
    issued_at = datetime.now(UTC)
    return jwt.encode(
        {
            "sub": str(user_id),
            "aud": IDENTITY_TOKEN_AUDIENCE,
            "iat": issued_at,
            "exp": issued_at + timedelta(seconds=IDENTITY_TOKEN_LIFETIME_SECONDS),
        },
        secret,
        algorithm=IDENTITY_TOKEN_ALGORITHM,
    )


def identity_token_user(token: str, secret: str) -> UUID:
    """Return the user identity carried by one valid Platform identity assertion."""

    # Reject missing runtime credentials before attempting JWT verification.
    if not secret:
        raise jwt.InvalidTokenError("Identity secret is required")

    # Restrict verification to LongLink's fixed algorithm and token purpose.
    try:
        data = jwt.decode(
            token,
            secret,
            audience=IDENTITY_TOKEN_AUDIENCE,
            algorithms=[IDENTITY_TOKEN_ALGORITHM],
            options={"require": ["exp", "iat", "sub"]},
        )
    except jwt.MissingRequiredClaimError as exc:
        raise jwt.InvalidTokenError("Invalid identity token claims") from exc
    raw_user_id = data["sub"]
    if not isinstance(raw_user_id, str):
        raise jwt.InvalidTokenError("Invalid identity token claims")
    try:
        return UUID(raw_user_id)
    except ValueError as exc:
        raise jwt.InvalidTokenError("Invalid identity token user") from exc
