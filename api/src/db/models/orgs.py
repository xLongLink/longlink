from enum import Enum
from datetime import datetime
from sqlalchemy import Boolean, DateTime, Enum as SqlEnum, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column
from src.db.models.__base__ import Base


class OrgRole(str, Enum):
    owner = 'owner'
    admin = 'admin'
    member = 'member'


class Org(Base):
    """Represent an organization account in the platform"""
    __tablename__ = 'organizations'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    country: Mapped[str | None] = mapped_column(String(2), nullable=True)

    # Metadata
    crn: Mapped[str | None] = mapped_column(String(25), unique=True, nullable=True) # Company Registration Number
    vat: Mapped[str | None] = mapped_column(String(25), unique=True, nullable=True) # Value Added Tax

    # ISIC, NACE, NAICS, NOGA, etc. industry classification code (4th layer)
    industry: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Date tracking
    date_creation: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    

class OrgMember(Base):
    """Represent a member of an organization"""
    __tablename__ = 'organizations_members'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    id_org: Mapped[int] = mapped_column(Integer, ForeignKey('organizations.id'), nullable=False)
    id_user: Mapped[int] = mapped_column(Integer, ForeignKey('users.id'), nullable=False)
    
    role: Mapped[OrgRole] = mapped_column(SqlEnum(OrgRole, name='org_role'), nullable=False)
    
    # Date tracking
    date_creation: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())


class OrgApp(Base):
    """Represent an app deployed for an organization."""

    __tablename__ = 'organizations_apps'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_org: Mapped[int] = mapped_column(Integer, ForeignKey('organizations.id'), nullable=False)
    id_app: Mapped[int] = mapped_column(Integer, ForeignKey('apps.id'), nullable=False)

    active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default='true')

    date_creation: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    
