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
    date_last_login: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


# class UserSetting(Base):
#     __tablename__ = "user_settings"
# 
#     user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), primary_key=True)
#     email_notifications: Mapped[bool] = mapped_column(
#         Boolean, server_default="true", default=True
#     )
#     two_factor_enabled: Mapped[bool] = mapped_column(
#         Boolean, server_default="false", default=False
#     )


"""
Read

- View code, issues, pull requests
- Clone the repository
- No write or management permissions

Triage

- Manage issues and pull requests (label, assign, close)
- Cannot push code or manage settings
- Designed for non-code contributors

Write

- Push code to the repository
- Create branches
- Manage issues and pull requests
- Cannot change repository settings or permissions

Maintain

- Everything in Write
- Manage repository settings (except destructive actions)
- Manage collaborators
- Cannot delete the repository or transfer ownership

Admin

- Full control
- Manage permissions and settings
- Delete or transfer the repository
"""