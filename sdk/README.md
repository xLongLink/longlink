# LongLink

Used to build and publish LongLink appliations.

- A combination of streamlit / appwrite and fastapi.
- Uses pydantic

- An module shall be as slim as possible, focusing only on the business logic.
- Automatic database migrations

## CLI

```
longlink init <module>
longlink build
longlink login
longlink logout
longlink publish <module>
```

## Stanalone

```
pip install longlink
```

```
pip install 'longlink[standalone]'
```

before update

- Mirgations
- Test cases
