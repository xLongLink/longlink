from datetime import datetime
from sqlalchemy import String, DateTime, BigInteger, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from src.db.models.__base__ import Base
from .users import User


class Organization(Base):
    """Represent an organization account in the platform"""
    __tablename__ = "organizations"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    
    # Date tracking
    date_creation: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())

    # legal_name = Column(String(200), nullable=True)
    # legal_form = Column(String(100), nullable=True)
    # business_description = Column(String(1000), nullable=True)

    # incorporation_date
    # jurisdiction_country
    # jurisdiction_region   (state / canton / province)
    # registration_number
    # company_status        (active, dissolved, liquidation, bankruptcy)

    # registered_address_id
    # operating_address_id

    # industry_code
    # industry_code_system  (NACE / NAICS / NOGA / SIC)
    # business_description
    # fiscal_year_end
    

class OrganizationMember(Base):
    """Represent a member of an organization"""
    __tablename__ = "organizations_members"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)

    id_org: Mapped[int] = mapped_column(BigInteger, ForeignKey("organizations.id"), nullable=False)
    id_user: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)
    
    role = mapped_column(String(50), nullable=False)


class OrganizationSetting(Base):
    pass







