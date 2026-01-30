from sqlalchemy import Column, String, BigInteger, Boolean, DateTime, ForeignKey, CheckConstraint, func
from src.db.models.__base__ import Base



# Modules can be passive -> Published 
# Or can be active, deployed -> Store Versions / Releases
# Store projects -> point to the github repository
# Main is the live system?? Need to publish?? With version? ->


class Module(Base):
    """
    Represent a module in the platform. 
    Each module is a ViaVai project that is hosted on a Git repository.
    """
    __tablename__ = "modules"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)

    # Owner can only be an organization
    owner_org_id = Column(BigInteger, ForeignKey("organizations.id"), nullable=True)

    created_at = Column(DateTime, nullable=False, server_default=func.now())


class ModuleSetting(Base):
    """
    Represent settings for a module.
    """
    __tablename__ = "module_settings"

    module_id = Column(BigInteger, ForeignKey("modules.id"), primary_key=True)
    is_public = Column(Boolean, nullable=False, server_default="false")
    allow_forks = Column(Boolean, nullable=False, server_default="true")

    CheckConstraint(
        "(is_public IN (true, false))",
        name="chk_module_settings_is_public_boolean"
    )

    CheckConstraint(
        "(allow_forks IN (true, false))",
        name="chk_module_settings_allow_forks_boolean"
    )