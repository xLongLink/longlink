import jwt
from typing import Literal, Annotated
from datetime import UTC, datetime, timedelta
from longlink import permissions
from pydantic import BaseModel, ConfigDict, BeforeValidator, ValidationError
from dataclasses import dataclass
from longlink.database.users import User

IDENTITY_TOKEN_ALGORITHM = "HS256"
IDENTITY_TOKEN_AUDIENCE = "longlink:identity"
IDENTITY_TOKEN_LIFETIME_SECONDS = 300


class DevelopmentIdentity(BaseModel):
    """Validate a frontend-defined identity accepted only in development."""

    model_config = ConfigDict(extra="forbid")

    # Local profile and Solution role.
    role: Literal["read", "write"]
    user: Annotated[User, BeforeValidator(User.model_validate)]


@dataclass(frozen=True, slots=True)
class IdentityClaims:
    """Carry the verified principal and request authorization metadata."""

    user: User | None
    access: permissions.Access
    role: str | None


def create_identity_token(user: User | None, secret: str, access: permissions.Access, *, role: str | None = None) -> str:
    """Create one short-lived Platform identity assertion for a Solution request."""

    # Every signed principal carries validated endpoint grants.
    access = permissions.Access.model_validate(access)

    # Bind the assertion to one user and a fixed runtime-only token purpose.
    issued_at = datetime.now(UTC)
    return jwt.encode(
        {
            "sub": str(user.id) if user is not None else "anonymous",
            "profile": user.model_dump(mode="json", exclude={"id"}) if user is not None else None,
            "access": access.model_dump(mode="json"),
            "role": role if user is not None else None,
            "aud": IDENTITY_TOKEN_AUDIENCE,
            "iat": issued_at,
            "exp": issued_at + timedelta(seconds=IDENTITY_TOKEN_LIFETIME_SECONDS),
        },
        secret,
        # Fix the signing algorithm independently of caller-controlled identity data.
        algorithm=IDENTITY_TOKEN_ALGORITHM,
    )


def identity_token_data(token: str, secret: str) -> tuple[User | None, permissions.Access]:
    """Preserve the user and endpoint-grant identity API."""

    claims = verify_identity_token(token, secret)
    return claims.user, claims.access


def verify_identity_token(token: str, secret: str) -> IdentityClaims:
    """Validate the user profile carried by a signed Platform identity assertion."""

    # Reject missing runtime credentials before attempting JWT verification.
    if not secret:
        raise jwt.InvalidTokenError("Identity secret is required")

    # Restrict verification to LongLink's fixed algorithm and token purpose.
    data = jwt.decode(
        token,
        secret,
        audience=IDENTITY_TOKEN_AUDIENCE,
        algorithms=[IDENTITY_TOKEN_ALGORITHM],
        options={"require": ["exp", "iat", "sub", "access"]},
    )

    # Validate profile fields and require an authoritative timestamp for ordered updates.
    try:
        if "profile" not in data:
            raise jwt.InvalidTokenError("Identity profile is required")
        access = permissions.Access.model_validate(data["access"])
        role = data.get("role")
        if role is not None and (not isinstance(role, str) or permissions.ROLE_PATTERN.fullmatch(role) is None):
            raise jwt.InvalidTokenError("Invalid identity role")

        # A signed anonymous principal has no profile and always has explicit endpoint grants.
        if data["sub"] == "anonymous":
            if data["profile"] is not None:
                raise jwt.InvalidTokenError("Invalid anonymous identity")
            return IdentityClaims(user=None, access=access, role=None)

        profile = data["profile"]
        if not isinstance(profile, dict) or "updated_at" not in profile:
            raise jwt.InvalidTokenError("Invalid identity token profile")

        # The JWT subject is authoritative even if a profile contains an identifier.
        user = User.model_validate({**profile, "id": data["sub"]})
        if user.updated_at.tzinfo is None:
            raise jwt.InvalidTokenError("Profile timestamp must include a timezone")
        user.updated_at = user.updated_at.astimezone(UTC)
        return IdentityClaims(user=user, access=access, role=role)

    # Invalid signed profiles share the JWT authentication error boundary.
    except ValidationError as exc:
        raise jwt.InvalidTokenError("Invalid identity token user") from exc
