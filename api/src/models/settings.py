from pydantic import BaseModel


class SettingSet(BaseModel):
    value: str


class SettingResponse(BaseModel):
    key: str
    value: str
    app_id: int | None = None
