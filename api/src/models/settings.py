from pydantic import BaseModel


class SettingSet(BaseModel):
    value: str


class SettingSetItem(BaseModel):
    key: str
    value: str


class SettingResponse(BaseModel):
    key: str
    value: str
    app_id: str | None = None
