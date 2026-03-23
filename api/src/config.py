from src.env import env


class Config:
    '''Runtime mutable configuration stored in memory and persisted in the database.'''

    _default_values: dict[str, str | None] = {
        'ORG_NAME': None,
        'ORG_NAME_LEGAL': None,
        'ORG_MAIL_CONTACT': None,
        'ORG_MAIL_SUPPORT': None,
        'ORG_TAX_ID': None,
        'ORG_PHONE': None,
        'ORG_WEBSITE': None,
        'ORG_ADDRESS': None,
        'ORG_LOGO': None,
    }

    def __init__(self) -> None:
        self._values: dict[str, str | None] = dict(self._default_values)
        self._reserved_keys = set(type(env).model_fields.keys())

    def normalize_key(self, key: str) -> str:
        normalized_key = key.strip().upper().replace('-', '_')
        if not normalized_key:
            raise ValueError('Configuration key cannot be empty')

        if normalized_key in self._reserved_keys or normalized_key.startswith('ENV_'):
            raise ValueError(f"'{normalized_key}' is environment-backed and cannot be updated at runtime")

        return normalized_key

    def get(self, key: str) -> str | None:
        normalized_key = self.normalize_key(key)
        return self._values.get(normalized_key)

    def set(self, key: str, value: str | None) -> str | None:
        normalized_key = self.normalize_key(key)
        self._values[normalized_key] = value
        return value


config = Config()
