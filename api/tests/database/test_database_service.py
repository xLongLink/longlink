import pytest
import psycopg2
from psycopg2 import sql
from src.db.models.databases import DatabaseConnection
from src.db.services.databases import DatabasesService

POSTGRES_HOST = '127.0.0.1'
POSTGRES_PORT = 15432
POSTGRES_USER = 'admin'
POSTGRES_PASSWORD = 'admin'
POSTGRES_DB = 'admin'


@pytest.mark.integration
async def test_create_database_with_local_postgres() -> None:
    database_name = 'app_test_db'

    try:
        connection = DatabaseConnection(
            name='default',
            host=POSTGRES_HOST,
            port=POSTGRES_PORT,
            username=POSTGRES_USER,
            password=POSTGRES_PASSWORD,
            maintenance_database=POSTGRES_DB,
            sslmode='disable',
        )

        await DatabasesService().create_database(
            connection=connection,
            database_name=database_name,
        )

        with psycopg2.connect(
            host=connection.host,
            port=connection.port,
            user=connection.username,
            password=connection.password,
            dbname=connection.maintenance_database,
            sslmode=connection.sslmode,
        ) as admin_connection:
            with admin_connection.cursor() as cursor:
                cursor.execute('SELECT 1 FROM pg_database WHERE datname = %s', (database_name,))
                assert cursor.fetchone() == (1,)
    except psycopg2.OperationalError as exc:  # pragma: no cover - integration env dependent
        pytest.skip(f'Local Postgres integration is unavailable: {exc}')
    finally:
        try:
            with psycopg2.connect(
                host=POSTGRES_HOST,
                port=POSTGRES_PORT,
                user=POSTGRES_USER,
                password=POSTGRES_PASSWORD,
                dbname=POSTGRES_DB,
                sslmode='disable',
            ) as admin_connection:
                admin_connection.autocommit = True
                with admin_connection.cursor() as cursor:
                    cursor.execute(
                        sql.SQL('DROP DATABASE IF EXISTS {}').format(sql.Identifier(database_name))
                    )
        except psycopg2.Error:
            pass
