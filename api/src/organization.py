import src.db as db
from typing import Final
from pydantic import BaseModel


class OrganizationSettings(BaseModel):
    ORG_NAME: str = ''
    ORG_NAME_LEGAL: str = ''
    ORG_TAX_ID: str = ''
    ORG_PHONE: str = ''
    ORG_MAIL_CONTACT: str = ''
    ORG_MAIL_SUPPORT: str = ''
    ORG_WEBSITE: str = ''
    ORG_ADDRESS: str = ''


org = OrganizationSettings()

ORGANIZATION_SETTINGS_KEYS: Final[tuple[str, ...]] = tuple(
    OrganizationSettings.model_fields.keys()
)


async def organization_settings_payload() -> dict[str, str]:
    payload: dict[str, str] = {}
    for key in ORGANIZATION_SETTINGS_KEYS:
        setting = await db.settings.get(key, app_id=None)
        payload[key] = setting.value if setting is not None else ''

    return payload
