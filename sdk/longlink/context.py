from typing import Annotated
from fastapi import Depends, Request, HTTPException
from dataclasses import dataclass
from collections.abc import AsyncGenerator
from longlink.storage import Storage
from longlink.database import audit
from longlink.database.users import User
from sqlmodel.ext.asyncio.session import AsyncSession


@dataclass(frozen=True, slots=True)
class _ContextData:
    """Hold Platform data and services for one Solution request."""

    user: User
    storage: Storage
    database: AsyncSession


async def _data(request: Request) -> AsyncGenerator[_ContextData, None]:
    """Yield the request context for a FastAPI dependency."""

    # Resolve a real user record before exposing request services to a Solution route.
    async with request.app.state.longlink.database.session() as database:
        user_id = audit.current_actor.get()
        if user_id is None:
            raise HTTPException(status_code=401, detail="Authentication required")

        # Signed identity must resolve to the request database's local user record.
        user = await database.get(User, user_id)
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")

        yield _ContextData(user=user, storage=request.app.state.longlink.storage, database=database)


Context = Annotated[_ContextData, Depends(_data)]
