from __future__ import annotations

from dataclasses import dataclass, field
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.engine import Engine
from sqlmodel import Session

from longlink.database.base import create_engine
from longlink.storage import Storage, create_storage
from longlink.utils.organization import Organization
from longlink.utils.settings import Settings


@dataclass
class State:
    """Request-scoped SDK context with app-managed services and aliases."""

    env: Settings
    organization: Organization
    engine: Engine
    storage: Storage
    session: Session
    pages: list = field(default_factory=list)

    @property
    def envs(self) -> Settings:
        """Return env alias used by older SDK code."""

        return self.env

    @property
    def org(self) -> Organization:
        """Return organization alias used by app code."""

        return self.organization

    @property
    def database(self) -> Engine:
        """Return DB engine alias used by app code."""

        return self.engine

    @property
    def db(self) -> Engine:
        """Return DB alias used by app code."""

        return self.engine

    @property
    def fs(self) -> Storage:
        """Return storage alias used by app code."""

        return self.storage


def build_state(env: Settings) -> State:
    """Create SDK state from app settings and managed service factories."""

    engine = create_engine(env)
    storage = create_storage(env)
    session = Session(engine)
    organization = Organization()
    return State(
        env=env,
        organization=organization,
        engine=engine,
        storage=storage,
        session=session,
    )


def get_context(request: Request) -> State:
    """Return app-managed SDK state for current request."""

    return request.app.state.context


Context = Annotated[State, Depends(get_context)]
ContextDep = Context
SessionDep = Session
StorageDep = Storage
