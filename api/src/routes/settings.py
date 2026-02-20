from fastapi import HTTPException

import src.db as db
from src.models.settings import SettingResponse, SettingSet
from src.router import router


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
