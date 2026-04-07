from pydantic import Field, BaseModel


class DatabaseConnectionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    host: str = Field(min_length=1, max_length=255)
    port: int = Field(default=5432, ge=1, le=65535)
    username: str = Field(min_length=1, max_length=128)
    password: str = Field(min_length=1, max_length=255)
    maintenance_database: str = Field(default='postgres', min_length=1, max_length=128)
    sslmode: str | None = Field(default=None, max_length=32)


class DatabaseConnectionDelete(BaseModel):
    name: str = Field(min_length=1, max_length=128)


class DatabaseConnectionResponse(BaseModel):
    name: str
    host: str
    port: int
    username: str
    maintenance_database: str
    sslmode: str | None = None


class DatabaseCreateResponse(BaseModel):
    database: str
    connection_name: str
    status: str = 'created'
