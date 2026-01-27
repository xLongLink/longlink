# ViaVai python Package

- Used to build viavai modules.
- Modules are published on ViaVai that handle the deployment, the billing, and the authentication.

- A combination of streamlit / appwrite and fastapi.
- Uses pydantic

- An module shall be as slim as possible, focusing only on the business logic.
  -> Automatic database migrations

## CLI

```
viavai init <module>
viavai login
viavai logout
viavai publish <module>
```

## Stanalone

```

pip install viavai

```

```

pip install viavai[standalone]

```

before update

- Mirgations
- Test cases

```

```
