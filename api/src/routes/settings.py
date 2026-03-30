import src.db as db
from typing import List
from fastapi import Query, HTTPException
from src.router import router
from src.models.settings import SettingSet, SettingSetItem, SettingResponse
from src.apps.organization import notify_all_apps_organization_settings


def _invalid_key_error(error: ValueError) -> HTTPException:
    return HTTPException(status_code=400, detail=str(error))


@router.get('/settings')
async def get_settings(keys: List[str] = Query(...)) -> List[SettingResponse]:
    results: List[SettingResponse] = []

    for key in keys:
        try:
            setting = await db.settings.get(key, app_id=None)
        except ValueError as error:
            raise _invalid_key_error(error) from error

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
        try:
            setting = await db.settings.set(item.key, item.value, app_id=None)
        except ValueError as error:
            raise _invalid_key_error(error) from error

        results.append(
            SettingResponse(
                key=setting.key,
                value=setting.value,
                app_id=setting.appid,
            )
        )

    await notify_all_apps_organization_settings()

    return results


@router.get('/settings/{key}')
async def get_setting(key: str) -> SettingResponse:
    try:
        setting = await db.settings.get(key, app_id=None)
    except ValueError as error:
        raise _invalid_key_error(error) from error

    if setting is None:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found")

    return SettingResponse(
        key=setting.key,
        value=setting.value,
        app_id=setting.appid,
    )


@router.post('/settings/{key}')
async def post_setting(key: str, payload: SettingSet) -> SettingResponse:
    try:
        setting = await db.settings.set(key, payload.value, app_id=None)
    except ValueError as error:
        raise _invalid_key_error(error) from error

    await notify_all_apps_organization_settings()

    return SettingResponse(
        key=setting.key,
        value=setting.value,
        app_id=setting.appid,
    )


@router.put('/settings/{key}')
async def set_setting(key: str, payload: SettingSet) -> SettingResponse:
    try:
        setting = await db.settings.set(key, payload.value, app_id=None)
    except ValueError as error:
        raise _invalid_key_error(error) from error

    await notify_all_apps_organization_settings()

    return SettingResponse(
        key=setting.key,
        value=setting.value,
        app_id=setting.appid,
    )
