from sqlalchemy import Table, MetaData, select
from sqlalchemy.engine import Connection
from src.database.types import EncryptedType


def rotate(connection: Connection, metadata: MetaData, old_key: str, new_key: str) -> int:
    """Re-encrypt credentials in the caller's transaction, accepting already-rotated values."""

    # Use the existing serialization and encryption format for both keys.
    old_type = EncryptedType(old_key)
    new_type = EncryptedType(new_key)
    rotated = 0

    # Discover protected fields from the models but reflect raw types to bypass automatic decryption.
    for model in metadata.tables.values():
        names = [column.name for column in model.columns if isinstance(column.type, EncryptedType)]
        if not names:
            continue
        table = Table(model.name, MetaData(), schema=model.schema, autoload_with=connection)
        columns = [table.c[name] for name in names]
        result = connection.execute(select(*table.primary_key.columns, *columns))

        # Accept new-key ciphertext first so retries and newly-created values remain unchanged.
        for row in result.mappings():
            updates = {}
            values = {}
            for name in names:
                ciphertext = row[name]
                try:
                    new_type.process_result_value(ciphertext, connection.dialect)
                    continue
                except ValueError:
                    pass

                # Abort without exposing ciphertext or plaintext when neither key can read a value.
                try:
                    value = old_type.process_result_value(ciphertext, connection.dialect)
                except ValueError:
                    raise RuntimeError(f"Cannot decrypt {model.name}.{name} with either encryption key") from None

                # Verify the replacement before storing it through raw reflected columns.
                replacement = new_type.process_bind_param(value, connection.dialect)
                if new_type.process_result_value(replacement, connection.dialect) != value:
                    raise RuntimeError(f"Encryption verification failed for {model.name}.{name}")
                updates[name] = replacement
                values[name] = value

            # Update by the reflected primary key and verify the persisted replacements.
            if updates:
                criteria = [column == row[column.name] for column in table.primary_key.columns]
                connection.execute(table.update().where(*criteria).values(updates))
                stored_result = connection.execute(select(*(table.c[name] for name in updates)).where(*criteria))
                stored = stored_result.mappings().one()
                for name, value in values.items():
                    if new_type.process_result_value(stored[name], connection.dialect) != value:
                        raise RuntimeError(f"Stored encryption verification failed for {model.name}.{name}")
                rotated += len(updates)

    return rotated
