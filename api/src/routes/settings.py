from typing import List

from fastapi import HTTPException, Query

import src.db as db
from src.models.settings import SettingResponse, SettingSet, SettingSetItem
from src.router import router


@router.get('/settings')
async def get_settings(keys: List[str] = Query(...)) -> List[SettingResponse]:
    results: List[SettingResponse] = []

    for key in keys:
        setting = await db.settings.get(key, app_id=None)
        if setting is None:
            raise HTTPException(status_code=404, detail=f"Setting '{key}' not found")

        results.append(
            SettingResponse(
                key=setting.key,
                value=setting.value,
                app_id=setting.appid,
            )
        )

    return results


@router.put('/settings')
async def set_settings(payload: List[SettingSetItem]) -> List[SettingResponse]:
    results: List[SettingResponse] = []

    for item in payload:
        setting = await db.settings.set(item.key, item.value, app_id=None)

        results.append(
            SettingResponse(
                key=setting.key,
                value=setting.value,
                app_id=setting.appid,
            )
        )

    return results


@router.get('/settings/{key}')
async def get_setting(key: str) -> SettingResponse:
    setting = await db.settings.get(key, app_id=None)
    if setting is None:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found")

    return SettingResponse(
        key=setting.key,
        value=setting.value,
        app_id=setting.appid,
    )


@router.put('/settings/{key}')
async def set_setting(key: str, payload: SettingSet) -> SettingResponse:
    setting = await db.settings.set(key, payload.value, app_id=None)
    return SettingResponse(
        key=setting.key,
        value=setting.value,
        app_id=setting.appid,
    )
