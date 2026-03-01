# SDK CLI Reference

The LongLink SDK exposes a CLI through the `viavai` command.

## Command Overview

### `viavai create <app_name>`
Creates a new app scaffold with the default project layout.

Typical generated structure:

```txt
main.py
migrations/
src/
├── cron/
├── models/
├── pages/
├── routes/
├── types/
└── app.py
tests/
```

### `viavai migrate`
Generates database migration scripts for the app schema using Alembic/SQLAlchemy conventions.

Use this after changing data models to keep database schema changes versioned.

### `viavai publish`
Publishes the app to the LongLink platform so it can be managed and executed by the control plane.

## Common Workflow

1. Create the app scaffold:

   ```bash
   viavai create my_app
   ```

2. Implement app logic, pages, and models.
3. Generate migrations when schema changes:

   ```bash
   viavai migrate
   ```

4. Publish the app:

   ```bash
   viavai publish
   ```

## Notes

- The SDK focuses on application business logic.
- Infrastructure concerns (auth, RBAC, orchestration, runtime isolation) are managed by LongLink.
