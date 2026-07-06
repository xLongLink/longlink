# Tenant

This package owns LongLink tenant-scoped shared resources.

It currently provides the shared tenant database schema and packaged Alembic migrations that can be applied to a live organization database.

Shared models live under `tenant.models`, while database tables and services live under `tenant.database`.

```python
from tenant.database import migrate_database
from tenant.models import User


await migrate_database("postgresql+psycopg://user:password@host:5432/longlink_acme")
```
