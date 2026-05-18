import src.db as db
import asyncio

DEFAULT_ORGANIZATIONS = ("default",)


async def main() -> None:
    """Seed the control plane database with baseline records."""

    # Keep development environments usable on a fresh SQLite database.
    for organization_name in DEFAULT_ORGANIZATIONS:
        organization = await db.organizations.get(organization_name)
        if organization is not None:
            continue

        await db.organizations.create(organization_name)


if __name__ == "__main__":
    asyncio.run(main())
