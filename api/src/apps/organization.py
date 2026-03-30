from __future__ import annotations

from typing import Final

import httpx

import src.db as db
from src.utils.apps import post


ORGANIZATION_SETTINGS_KEYS: Final[tuple[str, ...]] = (
    'ORG_NAME',
    'ORG_NAME_LEGAL',
    'ORG_TAX_ID',
    'ORG_PHONE',
    'ORG_MAIL_CONTACT',
    'ORG_MAIL_SUPPORT',
    'ORG_WEBSITE',
    'ORG_ADDRESS',
)


async def organization_settings_payload() -> dict[str, str]:
    payload: dict[str, str] = {}

    for key in ORGANIZATION_SETTINGS_KEYS:
        setting = await db.settings.get(key, app_id=None)
        payload[key] = setting.value if setting is not None else ''

    return payload


async def notify_app_organization_settings(url: str, payload: dict[str, str]) -> None:
    endpoint = f'{url.rstrip('/')}/organization'

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.put(endpoint, json=payload)
            if response.status_code >= 400:
                await post(url, '/organization', json=payload, timeout=10.0)
    except httpx.RequestError:
        return


async def notify_all_apps_organization_settings() -> None:
    apps = await db.apps.list()
    payload = await organization_settings_payload()

    for app in apps:
        await notify_app_organization_settings(app.url, payload)
