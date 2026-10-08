from uuid import UUID
from typing import Annotated
from fastapi import Depends, FastAPI, Request, HTTPException
from dataclasses import dataclass
from fsspec.spec import AbstractFileSystem
from collections.abc import AsyncGenerator
from longlink.database import audit
from longlink.responses import FileResponse
from longlink.shared.models import User
from longlink.middleware.identity import IdentityMiddleware
from sqlmodel.ext.asyncio.session import AsyncSession


@dataclass(frozen=True, slots=True)
class _ContextData:
    """Hold Platform data and services for one Solution request."""

    user: User
    storage: AbstractFileSystem
    database: AsyncSession

    def file(self, path: str, *, filename: str | None = None, media_type: str | None = None) -> FileResponse:
        """Serve a stored file for browser preview, using its basename by default."""

        # Bind the request filesystem while leaving access checks to the Solution route.
        return FileResponse(self.storage, path, filename=filename, media_type=media_type)

    def download(self, path: str, *, filename: str | None = None, media_type: str | None = None) -> FileResponse:
        """Serve a stored file as a download, using its basename by default."""

        # Use the same streaming lifecycle with an explicit attachment disposition.
        return FileResponse(self.storage, path, filename=filename, media_type=media_type, content_disposition_type="attachment")


async def _data(request: Request) -> AsyncGenerator[_ContextData, None]:
    """Yield the request context for a FastAPI dependency."""

    # Resolve a real user record before exposing request services to a Solution route.
    async with request.app.state.longlink.database.session() as database:
        user_id = audit.current_actor.get()
        if user_id is None:
            raise HTTPException(status_code=401, detail="Authentication required")

        user = await database.get(User, user_id)
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")

        yield _ContextData(user=user, storage=request.app.state.longlink.storage, database=database)  # noqa: ASYNC119


Context = Annotated[_ContextData, Depends(_data)]


def install_context_middleware(
    app: FastAPI,
    identity_secret: str | None,
    *,
    require_identity: bool = False,
    local_user_id: UUID | None = None,
) -> None:
    """Bind trusted Platform identity for the complete request lifecycle."""

    # Reject an incomplete production policy before the middleware stack is built.
    if require_identity and not identity_secret:
        raise ValueError("Identity secret is required for protected Solution requests")

    # One ASGI owner handles transport admission and the complete audit scope.
    app.add_middleware(
        IdentityMiddleware,
        identity_secret=identity_secret,
        require_identity=require_identity,
        local_user_id=local_user_id,
    )
