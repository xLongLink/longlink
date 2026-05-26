from sqlalchemy import Column, Enum, ForeignKey, ForeignKeyConstraint, String, Table

from src.db.models.__base__ import Base
from src.models.roles import ROLES

user_organizations = Table(
    'user_organizations',
    Base.metadata,
    Column('user_id', ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
    Column('organization_name', ForeignKey('organizations.name', ondelete='CASCADE'), primary_key=True),
    Column('role_name', Enum(*ROLES, name='role_name_enum', native_enum=False), nullable=False),
)

user_apps = Table(
    'user_apps',
    Base.metadata,
    Column('user_id', ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
    Column('organization_name', ForeignKey('organizations.name', ondelete='CASCADE'), primary_key=True),
    Column('app_name', String(100), primary_key=True),
    Column('role_name', Enum(*ROLES, name='role_name_enum', native_enum=False), nullable=False),
    ForeignKeyConstraint(
        ['organization_name', 'app_name'],
        ['apps.organization', 'apps.name'],
        ondelete='CASCADE',
    ),
)
