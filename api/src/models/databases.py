from pydantic import BaseModel


class DatabaseOverviewMetric(BaseModel):
    key: str
    label: str
    value: str
    unit: str | None = None
    description: str | None = None
