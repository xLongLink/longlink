from __future__ import annotations

import pytest
from uuid import UUID
from typing import ClassVar
from longlink import User, Model, UserRelationship
from sqlmodel import Field, SQLModel
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import registry
from longlink.database import base as database_base
from longlink.utils.settings import Envs


async def test_user_relationships_persist_required_and_optional_roles() -> None:
    """Persist distinct user roles and reject a missing required owner."""

    # Own cleanup before any declaration or constructor can configure a failing mapper.
    mapper_registry = registry(metadata=SQLModel.metadata, class_registry={"User": User})
    database = database_base.Database(Envs(ENV="testing"))
    try:

        # Arrange postponed annotations for both required and optional user roles.
        class RelationshipModel(Model, registry=mapper_registry):
            """Own only this test's temporary mapper while sharing real table metadata."""

        class UserRoleItem(RelationshipModel, table=True):
            """Persist an owner and a distinct optional approver."""

            # Table metadata
            __tablename__: ClassVar[str] = "test_user_role_items"

            # Identifier
            id: int | None = Field(default=None, primary_key=True)

            # User roles
            owner: User = UserRelationship()
            approved_by: User | None = UserRelationship()

        owner = User(id=UUID("00000000-0000-0000-0000-000000000002"), name="Owner", email="owner@example.com")
        approver = User(id=UUID("00000000-0000-0000-0000-000000000003"), name="Approver", email="approver@example.com")

        # Act
        async with database.session() as session:
            session.add_all([owner, approver])
            unapproved = UserRoleItem(owner=owner)
            approved = UserRoleItem(owner=owner, approved_by=approver)
            session.add_all([unapproved, approved])
            await session.commit()
            unapproved_id = unapproved.id
            approved_id = approved.id

        # Assert committed values through a fresh identity map.
        async with database.session() as session:
            unapproved = await session.get(UserRoleItem, unapproved_id)
            assert unapproved is not None
            assert getattr(unapproved, "owner_id") == owner.id
            assert unapproved.owner.id == owner.id
            assert getattr(unapproved, "approved_by_id") is None
            assert unapproved.approved_by is None

            # Inspect a second row with an explicitly assigned optional approver.
            approved = await session.get(UserRoleItem, approved_id)
            assert approved is not None

            # Generated foreign keys must retain their independently assigned user identities.
            assert getattr(approved, "owner_id") == owner.id
            assert approved.owner.id == owner.id
            assert getattr(approved, "approved_by_id") == approver.id
            assert approved.approved_by is not None
            assert approved.approved_by.id == approver.id

        # Verify required/optional column contracts through actual persistence.
        table = SQLModel.metadata.tables[UserRoleItem.__tablename__]
        assert not table.c.owner_id.nullable
        assert table.c.approved_by_id.nullable
        async with database.session() as session:
            session.add(UserRoleItem())

            # Required user relations remain enforced by the database.
            with pytest.raises(IntegrityError, match="NOT NULL constraint failed: test_user_role_items.owner_id"):
                await session.commit()
            await session.rollback()
    finally:

        # Release each local resource even if another cleanup step fails.
        try:
            await database.dispose()
        finally:
            try:

                # Release this test's mapper registry before removing table metadata.
                mapper_registry.dispose()
            finally:

                # Remove only the test table, including a partially configured declaration.
                table = SQLModel.metadata.tables.get("test_user_role_items")
                if table is not None:
                    SQLModel.metadata.remove(table)
