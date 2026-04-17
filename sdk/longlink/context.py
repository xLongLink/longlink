from typing import Annotated
from fastapi import Depends, Request
from sqlmodel import Session
from longlink.storage import Storage, get_storage
from longlink.database import get_session


class Context:
    """Request context exposing SDK dependencies with stable aliases."""

    def __init__(self, storage: Storage, session: Session, request: Request):
        """Store request-scoped resources and compatibility aliases."""
        self.storage = storage
        self.session = session
        self.envs = request.app.state.env


def get_env(request: Request):
    return request.app.state.env


def get_context(
    request: Request,
    storage: Storage = Depends(get_storage),
    session: Session = Depends(get_session),
) -> Context:
    """Build request context from storage and DB session dependencies."""

    return Context(storage=storage, session=session, request=request)


SessionDep = Annotated[Session, Depends(get_session)]
StorageDep = Annotated["Storage", Depends(get_storage)]
ContextDep = Annotated["Context", Depends(get_context)]

