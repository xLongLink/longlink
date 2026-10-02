<div align="center">

<img src="../banner.png" alt="LongLink banner" />

</div>

> [!WARNING]
> LongLink is under active development. APIs may change before 1.0.

<br />

## LongLink Platform API

LongLink provides the shared foundation for running Solutions.
The Platform API manages organizations, users, access,
deployments, and supporting infrastructure.

<br />

## Encryption key rotation

The API encrypts stored database passwords, kubeconfigs, storage credentials,
Solution secrets, and revision environment values with `ENCRYPTION_KEY`.

To rotate the key, stop all API instances and other database writers, then back
up the database and securely retain its current key. In the API's `.env` or secret
configuration, set `OLD_ENCRYPTION_KEY` to the current key and `ENCRYPTION_KEY` to
a new random key (generate one with `openssl rand -base64 48`). Never commit keys.

From `api/`, run:

```bash
uv run alembic upgrade head
```

After schema migrations, the command automatically re-encrypts protected fields
in a transaction and verifies the stored results before committing. It also runs
when the schema is already at head. Values already readable with the new key are
unchanged, so rerunning is safe. An unreadable value aborts and rolls back the
rotation without logging secrets. Schema DDL rollback depends on the database.
Rotation is not performed for downgrades, stamps, autogeneration, or upgrades to
specific revision IDs; offline `--sql` upgrades to head reject rotation.

After success, remove `OLD_ENCRYPTION_KEY` and restart every API instance using the
new `ENCRYPTION_KEY`. Retain the old key securely while older backups need it.
After failure, keep the API stopped until the issue is resolved or restore the
backup and its corresponding key. For a fresh database or ordinary migration,
leave `OLD_ENCRYPTION_KEY` unset.

<br />

## Release

The API is published as a Linux AMD64 container image on GitHub Container
Registry.

| Name   | Image                        | Tag                               |
| ------ | ---------------------------- | --------------------------------- |
| Stable | `ghcr.io/xlonglink/longlink` | `v<major>.<minor>.<patch>`        |
| Beta   | `ghcr.io/xlonglink/longlink` | `v<major>.<minor>.<patch>-beta.N` |

<br />

---

<div align="center">
LongLink 2026

[License](../LICENSE) &nbsp; - &nbsp; [Contributing](../CONTRIBUTING.md) &nbsp; - &nbsp; [Code of Conduct](../CODE_OF_CONDUCT.md) &nbsp; - &nbsp; [Contact](mailto:info@longlink.dev)

</div>

---
