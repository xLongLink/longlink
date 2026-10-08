import httpx2
from pydantic import Field, BaseModel, SecretStr
from src.errors import InvalidError, ForbiddenError, UnavailableError


class Profile(BaseModel):
    """Validate the account identity returned by GitHub's authenticated-user endpoint."""

    # Identity
    login: str = Field(min_length=1, max_length=100, pattern=r"^[A-Za-z0-9-]+$")


async def username(credential: SecretStr) -> str:
    """Resolve the owner of a GitHub token without exposing the credential."""

    # Reject characters that cannot safely form a bearer authorization header.
    token = credential.get_secret_value()
    if not token.isascii() or not token.isprintable():
        raise InvalidError("GitHub token has an invalid format")

    # Send the credential only to GitHub's fixed HTTPS endpoint, never through redirects or environment proxies.
    client = httpx2.AsyncClient(
        timeout=5.0,
        trust_env=False,
        follow_redirects=False,
    )
    try:
        async with client:
            response = await client.get(
                "https://api.github.com/user",
                headers={
                    "Accept": "application/vnd.github+json",
                    "Authorization": f"Bearer {token}",
                    "X-GitHub-Api-Version": "2022-11-28",
                },
            )
    except httpx2.HTTPError as exc:
        raise UnavailableError("GitHub account lookup is unavailable. Try again later.") from exc

    # Reject invalid credentials and surface provider failures before persisting a connection.
    if response.status_code == 401:
        raise InvalidError("GitHub token is invalid or expired")
    if response.status_code == 403:
        raise ForbiddenError("GitHub denied account access. Check the token permissions or try again later.")
    if not response.is_success:
        raise UnavailableError("GitHub account lookup is unavailable. Try again later.")

    # Validate the provider's username before it becomes a registry authentication identity.
    try:
        profile = Profile.model_validate(response.json())
    except ValueError as exc:
        raise UnavailableError("GitHub returned an invalid account profile") from exc
    return profile.login
