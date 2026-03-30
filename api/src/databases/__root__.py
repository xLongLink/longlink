class Database:
    """Base class for database management. Individual adapters should inherit from this class and implement the methods."""
    def create(self, app_id: str) -> str:
        raise NotImplementedError

    def delete(self, app_id: str) -> None:
        raise NotImplementedError

    def credentials(self, app_id: str) -> dict[str, str | int]:
        raise NotImplementedError
