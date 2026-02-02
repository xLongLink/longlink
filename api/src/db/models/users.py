from datetime import datetime
from sqlalchemy import Integer, String, DateTime, BigInteger, func
from sqlalchemy.orm import Mapped, mapped_column
from src.db.models.__base__ import Base



class User(Base):
    """
    Represent a user account in the platform. 
    
    We don't support credential-based authentication directly; instead, users authenticate via OAuth providers.
    """
    __tablename__ = "users"

    # Basic user metadata
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    avatar: Mapped[str | None] = mapped_column(String(2048), nullable=True)

    # OAuth provider details, user can have multiple linked providers
    oauth_github_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    # Date tracking
    date_creation: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
