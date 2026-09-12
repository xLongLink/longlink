import contextlib
from typing import override
from src.adapters import postgres
from collections.abc import Iterator
from sqlalchemy.engine import URL


class Postgres(postgres.Postgres):
    """Use a loopback Kubernetes tunnel only for host-run development SQL."""

    @override
    @contextlib.contextmanager
    def url(self, database: str, search_path: str | None = None) -> Iterator[URL]:
        """Keep the cluster hostname as the TLS identity while connecting through loopback."""

        # Reuse certificate lifetime and SQL settings; only development changes the transport address.
        with super().url(database, search_path) as url:
            yield url.update_query_dict({"hostaddr": "127.0.0.1"})
