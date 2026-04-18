from typing import Annotated
from fastapi import Depends, Request
from sqlmodel import Session
from dataclasses import field, dataclass
from longlink.storage import Storage, create_storage
from sqlalchemy.engine import Engine
from longlink.utils.page import Page
from longlink.database.base import create_engine
from longlink.utils.settings import Settings


@dataclass
class State:
    """Request-scoped SDK context with app-managed services and aliases."""
    engine: Engine
    storage: Storage
    session: Session
    pages: list[Page] = field(default_factory=list)


def create_state(env: Settings) -> State:
    """Create SDK state from app settings and managed service factories."""

    engine = create_engine(env)
    storage = create_storage(env)
    session = Session(engine)
    return State(
        engine=engine,
        storage=storage,
        session=session,
    )


def get_context(request: Request) -> State:
    """Return app-managed SDK state for current request."""

    return request.app.state.context


Context = Annotated[State, Depends(get_context)]
