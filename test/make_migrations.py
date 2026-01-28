from alembic import command
from alembic.config import Config


def make_migrations():
    cfg = Config()
    cfg.set_main_option("script_location", "migrations")

    command.revision(cfg, autogenerate=True)


def migrate():
    cfg = Config()
    cfg.set_main_option("script_location", "migrations")
    command.upgrade(cfg, "head")


if __name__ == "__main__":
    make_migrations()
    migrate()
