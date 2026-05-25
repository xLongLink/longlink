from sqlalchemy import Column, Enum, ForeignKey, ForeignKeyConstraint, String, Table

from src.db.models.__base__ import Base
from src.models.roles import RoleName

role_enum = Enum(
    RoleName,
    name='role_name_enum',
    values_callable=lambda enum: [member.value for member in enum],
    native_enum=False,
)

user_organizations = Table(
    'user_organizations',
    Base.metadata,
    Column('user_id', ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
    Column('organization_name', ForeignKey('organizations.name', ondelete='CASCADE'), primary_key=True),
    Column('role_name', role_enum, nullable=False),
)

user_apps = Table(
    'user_apps',
    Base.metadata,
    Column('user_id', ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
    Column('organization_name', ForeignKey('organizations.name', ondelete='CASCADE'), primary_key=True),
    Column('app_name', String(100), primary_key=True),
    Column('role_name', role_enum, nullable=False),
    ForeignKeyConstraint(
        ['organization_name', 'app_name'],
        ['apps.organization', 'apps.name'],
        ondelete='CASCADE',
    ),
)

role_permissions = Table(
    'role_permissions',
    Base.metadata,
    Column('role_name', role_enum, primary_key=True),
    Column('permission_name', ForeignKey('permissions.name', ondelete='CASCADE'), primary_key=True),
)
