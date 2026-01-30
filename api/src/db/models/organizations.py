from sqlalchemy import Column, BigInteger, String, DateTime, func
from src.db.models.__base__ import Base


class Organization(Base):
    """
    Represent an organization account in the platform. 
    """
    __tablename__ = "organizations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)
    
    legal_name = Column(String(200), nullable=True)
    legal_form = Column(String(100), nullable=True)
    business_description = Column(String(1000), nullable=True)

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

    created_at = Column(DateTime, nullable=False, server_default=func.now())






