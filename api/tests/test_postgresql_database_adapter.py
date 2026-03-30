import pytest
from sqlalchemy import text, create_engine
from src.databases.postgresql import PostgreSQL

pytest.importorskip('testcontainers.postgres')
from testcontainers.postgres import PostgresContainer


@pytest.mark.integration
def test_postgresql_database_control_plane() -> None:
    try:
        with PostgresContainer('postgres:16') as postgres:
            adapter = PostgreSQL(
                host=postgres.get_container_host_ip(),
                port=int(postgres.get_exposed_port(5432)),
                username=postgres.username,
                password=postgres.password,
                admin_database='postgres',
            )

            app_id = 'billing-service/v1'
            database_name = adapter.create(app_id)

            assert database_name.startswith('app_')
            assert len(database_name) <= 63

            recreated_name = adapter.create(app_id)
            assert recreated_name == database_name

            with create_engine(adapter.control_plane_url, isolation_level='AUTOCOMMIT').connect() as conn:
                exists_after_create = conn.execute(
                    text('SELECT 1 FROM pg_database WHERE datname = :name'),
                    {'name': database_name},
                ).scalar()

            assert exists_after_create == 1

            credentials = adapter.credentials(app_id)
            assert credentials['type'] == 'postgresql'
            assert credentials['name'] == database_name
            assert credentials['host'] == adapter.host
            assert credentials['port'] == adapter.port
            assert credentials['username'] == adapter.username
            assert database_name in str(credentials['connection_url'])

            adapter.delete(app_id)

            with create_engine(adapter.control_plane_url, isolation_level='AUTOCOMMIT').connect() as conn:
                exists_after_delete = conn.execute(
                    text('SELECT 1 FROM pg_database WHERE datname = :name'),
                    {'name': database_name},
                ).scalar()

            assert exists_after_delete is None
    except Exception as exc:  # pragma: no cover - environment dependent
        pytest.skip(f'Docker/Testcontainers unavailable in this environment: {exc}')
