import httpx2
from fastapi import HTTPException
from pydantic import Field, BaseModel, SecretStr


class Profile(BaseModel):
    """Validate the account identity returned by GitHub's authenticated-user endpoint."""

    # Identity
    login: str = Field(min_length=1, max_length=100, pattern=r"^[A-Za-z0-9-]+$")


async def username(credential: SecretStr, *, transport: httpx2.AsyncBaseTransport | None = None) -> str:
    """Resolve the owner of a GitHub token without exposing the credential."""

    # Reject characters that cannot safely form a bearer authorization header.
    token = credential.get_secret_value()
    if not token.isascii() or not token.isprintable():
        raise HTTPException(status_code=422, detail="GitHub token has an invalid format")

    # Send the credential only to GitHub's fixed HTTPS endpoint, never through redirects or environment proxies.
    client = httpx2.AsyncClient(timeout=5.0, trust_env=False, follow_redirects=False, transport=transport)
    try:
        async with client:
            response = await client.get(
                "https://api.github.com/user",
                headers={"Accept": "application/vnd.github+json", "Authorization": f"Bearer {token}", "X-GitHub-Api-Version": "2022-11-28"},
            )

    # Provider transport failures must not expose authentication details.
    except httpx2.HTTPError:
        raise HTTPException(status_code=503, detail="GitHub account lookup is unavailable. Try again later.")

    # Reject invalid credentials and surface provider failures before persisting a connection.
    if response.status_code == 401:
        raise HTTPException(status_code=422, detail="GitHub token is invalid or expired")
    if response.status_code == 403:
        raise HTTPException(status_code=403, detail="GitHub denied account access. Check the token permissions or try again later.")
    if not response.is_success:
        raise HTTPException(status_code=503, detail="GitHub account lookup is unavailable. Try again later.")

    # Validate the provider's username before it becomes a registry authentication identity.
    try:
        profile = Profile.model_validate(response.json())
    except ValueError:
        raise HTTPException(status_code=503, detail="GitHub returned an invalid account profile")
    return profile.login
