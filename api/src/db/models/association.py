from sqlalchemy import Table, Column, ForeignKey
from src.db.models.__base__ import Base

user_organizations = Table(
    'user_organizations',
    Base.metadata,
    Column('user_id', ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
    Column('organization_name', ForeignKey('organizations.name', ondelete='CASCADE'), primary_key=True),
)
