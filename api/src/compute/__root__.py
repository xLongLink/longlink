class Compute:
    """Base class for compute management adapters."""

    def create(self, app_id: str) -> str:
        raise NotImplementedError

    def deploy(self, app_id: str, image: str) -> str:
        raise NotImplementedError

    def delete(self, app_id: str) -> None:
        raise NotImplementedError

    def credentials(self, app_id: str) -> dict[str, str | int]:
        raise NotImplementedError
