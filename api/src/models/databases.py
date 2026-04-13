from pydantic import BaseModel


class DatabaseUsageSummary(BaseModel):
    used_bytes: int | None = None
    free_bytes: int | None = None


class DatabaseConfigSummary(BaseModel):
    host: str
    port: int
    username: str
    maintenance_database: str
    sslmode: str | None = None


class DatabaseSummaryResponse(BaseModel):
    configured: bool
    config: DatabaseConfigSummary | None = None
    usage: DatabaseUsageSummary = DatabaseUsageSummary()


class DatabaseCreateResponse(BaseModel):
    database: str
    status: str = 'created'
