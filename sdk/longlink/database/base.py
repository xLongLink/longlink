from sqlmodel import Session, SQLModel, create_engine

DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(DATABASE_URL, echo=False)


# Keep backward-compatible alias for code still importing `Base`.
Base = SQLModel


def get_session() -> Session:
    """Create DB session bound to SDK engine."""
    return Session(engine)
