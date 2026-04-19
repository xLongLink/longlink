import src.db as db
from typing import List
from fastapi import Query, APIRouter, HTTPException
from src.models.settings import SettingSet, SettingSetItem, SettingResponse

router = APIRouter()


@router.get("/settings")
async def get_settings(keys: List[str] = Query(...)) -> List[SettingResponse]:
    """Return settings for the given keys."""
    results: List[SettingResponse] = []

    for key in keys:
        try:
            setting = await db.settings.get(key, app_id=None)
        except ValueError as error:
            return HTTPException(status_code=400, detail=str(error))

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


@router.put("/settings")
async def set_settings(payload: List[SettingSetItem]) -> List[SettingResponse]:
    """Create or update multiple settings at once."""
    results: List[SettingResponse] = []

    for item in payload:
        try:
            setting = await db.settings.set(item.key, item.value, app_id=None)
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error))

        results.append(
            SettingResponse(
                key=setting.key,
                value=setting.value,
                app_id=setting.appid,
            )
        )

    return results


@router.get("/settings/{key}")
async def get_setting(key: str) -> SettingResponse:
    """Return a single setting by key."""
    try:
        setting = await db.settings.get(key, app_id=None)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))

    if setting is None:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found")

    return SettingResponse(
        key=setting.key,
        value=setting.value,
        app_id=setting.appid,
    )


@router.post("/settings/{key}")
async def post_setting(key: str, payload: SettingSet) -> SettingResponse:
    """Create or update a setting by key (POST creates or replaces)."""
    try:
        setting = await db.settings.set(key, payload.value, app_id=None)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))

    return SettingResponse(
        key=setting.key,
        value=setting.value,
        app_id=setting.appid,
    )


@router.put("/settings/{key}")
async def set_setting(key: str, payload: SettingSet) -> SettingResponse:
    """Create or update a setting by key (PUT replaces the value)."""
    try:
        setting = await db.settings.set(key, payload.value, app_id=None)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))

    return SettingResponse(
        key=setting.key,
        value=setting.value,
        app_id=setting.appid,
    )
