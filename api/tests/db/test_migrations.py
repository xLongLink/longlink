import ast
import pytest
from pathlib import Path
from sqlmodel import SQLModel
from alembic.config import Config
from alembic.script import ScriptDirectory
from src.database.models import (users, computes, storages, databases,
                                 locations, operations, association,
                                 invitations, applications, organizations)

pytestmark = pytest.mark.no_db
_MODEL_MODULES = (users, computes, storages, databases, locations, operations, association, invitations, applications, organizations)


class MigrationCollector(ast.NodeVisitor):
    """Collect table and column operations from Alembic migration files."""

    def __init__(self) -> None:
        """Initialize the migration operation registry."""

        self.columns: dict[str, set[str]] = {}
        self._table_stack: list[str] = []

    def visit_Call(self, node: ast.Call) -> None:
        """Collect create-table and add-column calls."""

        call_name = self._call_name(node)
        if call_name == "create_table" and node.args:
            table_name = self._constant(node.args[0])
            if table_name is not None:
                for argument in node.args[1:]:
                    column_name = self._column_name(argument)
                    if column_name is not None:
                        self.columns.setdefault(table_name, set()).add(column_name)

        if call_name == "add_column":
            table_name = self._current_table_name(node)
            column_argument = node.args[-1] if node.args else None
            column_name = self._column_name(column_argument)
            if table_name is not None and column_name is not None:
                self.columns.setdefault(table_name, set()).add(column_name)

        self.generic_visit(node)

    def visit_With(self, node: ast.With) -> None:
        """Track the table name inside batch-alter blocks."""

        table_name = self._batch_table_name(node)
        if table_name is None:
            self.generic_visit(node)
            return

        self._table_stack.append(table_name)
        for statement in node.body:
            self.visit(statement)
        self._table_stack.pop()

    def _current_table_name(self, node: ast.Call) -> str | None:
        """Return the table name for an add-column call."""

        if self._table_stack:
            return self._table_stack[-1]

        if node.args:
            return self._constant(node.args[0])

        return None

    def _batch_table_name(self, node: ast.With) -> str | None:
        """Return the table name for a batch-alter with block."""

        for item in node.items:
            context_expr = item.context_expr
            if isinstance(context_expr, ast.Call) and self._call_name(context_expr) == "batch_alter_table":
                if context_expr.args:
                    return self._constant(context_expr.args[0])

        return None

    def _column_name(self, node: ast.AST | None) -> str | None:
        """Return the column name from a SQLAlchemy column call."""

        if not isinstance(node, ast.Call) or self._call_name(node) != "Column" or not node.args:
            return None

        return self._constant(node.args[0])

    def _call_name(self, node: ast.Call) -> str:
        """Return the attribute or function name for one call."""

        if isinstance(node.func, ast.Attribute):
            return node.func.attr

        if isinstance(node.func, ast.Name):
            return node.func.id

        return ""

    def _constant(self, node: ast.AST) -> str | None:
        """Return a string literal value from an AST node."""

        if isinstance(node, ast.Constant) and isinstance(node.value, str):
            return node.value

        return None


def _migration_columns() -> dict[str, set[str]]:
    """Return columns created or added by the Alembic migration history."""

    collector = MigrationCollector()
    for migration_path in sorted((Path(__file__).resolve().parents[2] / "alembic" / "versions").glob("*.py")):
        collector.visit(ast.parse(migration_path.read_text(encoding="utf-8")))

    return collector.columns


def test_alembic_migrations_have_single_linear_head() -> None:
    """Keep the control-plane migration graph linear and predictable."""

    config = Config()
    config.set_main_option("script_location", str(Path(__file__).resolve().parents[2] / "alembic"))
    script = ScriptDirectory.from_config(config)

    assert len(script.get_bases()) == 1
    assert len(script.get_heads()) == 1


def test_migrations_cover_current_control_plane_model_columns() -> None:
    """Ensure all SQLModel control-plane tables and columns are represented in migrations."""

    migration_columns = _migration_columns()
    model_columns = {
        table.name: {column.name for column in table.columns}
        for table in SQLModel.metadata.sorted_tables
    }

    assert model_columns.keys() <= migration_columns.keys()
    for table_name, columns in model_columns.items():
        assert columns <= migration_columns[table_name]
