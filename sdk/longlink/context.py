from __future__ import annotations

from typing import Annotated
from fastapi import Depends, Request
from sqlmodel import Session
from dataclasses import dataclass
from longlink.storage import Storage, get_storage
from longlink.database import get_session
from longlink.utils.settings import Settings, get_env
from longlink.utils.organization import OrganizationSettings, org


@dataclass
class AppContext:
    """Request context exposing SDK dependencies and aliases."""

    envs: Settings
    organization: OrganizationSettings
    storage: Storage
    session: Session
    request: Request

    @property
    def fs(self) -> Storage:
        """Expose storage dependency through fs alias."""

        return self.storage

    @property
    def database(self) -> Session:
        """Expose DB session through database alias."""

        return self.session

    @property
    def db(self) -> Session:
        """Expose DB session through db alias."""

        return self.session


def get_context(
    request: Request,
    envs: Settings = Depends(get_env),
    storage: Storage = Depends(get_storage),
    session: Session = Depends(get_session),
) -> AppContext:
    """Build request context from settings, organization, storage, and DB dependencies."""

    return AppContext(
        envs=envs,
        organization=org,
        storage=storage,
        session=session,
        request=request,
    )


StorageDep = Annotated[Storage, Depends(get_storage)]
SessionDep = Annotated[Session, Depends(get_session)]
ContextDep = Annotated[AppContext, Depends(get_context)]
Context = ContextDep
