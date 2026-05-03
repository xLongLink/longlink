import fsspec
from typing import Annotated
from fastapi import Depends, Request
from sqlmodel import Session
from dataclasses import field, dataclass
from longlink.storage import create_storage
from sqlalchemy.engine import Engine
from longlink.utils.xml import Page
from longlink.database.base import create_engine
from longlink.utils.settings import Environments


@dataclass
class State:
    """Request-scoped SDK context with app-managed services and aliases."""
    engine: Engine
    _fs: fsspec.AbstractFileSystem
    session: Session
    pages: list[Page] = field(default_factory=list)

    def fs(self) -> fsspec.AbstractFileSystem:
        """Return the native fsspec filesystem configured for this application."""

        return self._fs


def create_state(env: Environments) -> State:
    """Create SDK state from app settings and managed service factories."""

    engine = create_engine(env)
    filesystem = create_storage(env)
    session = Session(engine)
    return State(
        engine=engine,
        _fs=filesystem,
        session=session,
    )


def get_context(request: Request) -> State:
    """Return app-managed SDK state for current request."""

    return request.app.state.context


Context = Annotated[State, Depends(get_context)]
