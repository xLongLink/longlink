from datetime import datetime
from src.db.models.__base__ import Base
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import BigInteger, DateTime, ForeignKey, String, func


class Org(Base):
    """Represent an organization account in the platform"""
    __tablename__ = 'organizations'

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    
    # Date tracking
    date_creation: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    

class OrgMember(Base):
    """Represent a member of an organization"""
    __tablename__ = 'organizations_members'

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)

    id_org: Mapped[int] = mapped_column(BigInteger, ForeignKey('organizations.id'), nullable=False)
    id_user: Mapped[int] = mapped_column(BigInteger, ForeignKey('users.id'), nullable=False)
    
    role = mapped_column(String(50), nullable=False)
    
    # Date tracking
    date_creation: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    
