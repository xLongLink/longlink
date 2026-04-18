from __future__ import annotations

from dataclasses import InitVar, dataclass
from typing import Annotated
from fastapi import Depends, Request
from sqlmodel import Session
from longlink.database import get_session
from longlink.storage import Storage, get_storage
from longlink.utils.settings import Settings, get_env


@dataclass
class AppContext:
    """Request context exposing SDK dependencies with stable aliases."""
    envs: Settings
    storage: Storage
    session: Session
    request: InitVar[Request]
    

def get_context(
    request: Request,
    envs: Settings = Depends(get_env),
    storage: Storage = Depends(get_storage),
    session: Session = Depends(get_session),
) -> AppContext:
    """Build request context from storage and DB session dependencies."""
    return AppContext(storage=storage, session=session, request=request, envs=envs)


Context = Annotated[AppContext, Depends(get_context)]
