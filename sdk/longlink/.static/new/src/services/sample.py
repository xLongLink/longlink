from longlink import fs
from src.models.project import Project
from src.types.user import UserModel


class SampleService:
    """Handle sample project persistence for the showcase app."""

    async def create_project(self, session_maker) -> UserModel:
        """Persist the sample project and return the typed response payload."""

        project_id = "sample-project"
        filename = f"sample-projects/{project_id}.txt"
        file_contents = f"Created project {project_id}."

        # Persist data with the shared filesystem instance.
        filesystem = fs
        with filesystem.open(filename, "wb") as file_handle:
            file_handle.write(file_contents.encode("utf-8"))

        project = Project(id=project_id, name="Minimal Showcase Project", owner="sample-user")

        # Persist data through the configured async session factory.
        async with session_maker() as session:
            session.add(project)
            await session.commit()
            await session.refresh(project)

        return UserModel(id=1, username="testuser", email="testuser@example.com")


sample = SampleService()
