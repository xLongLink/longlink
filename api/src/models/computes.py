from pydantic import Field, BaseModel


class ComputeConnectionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    api_server_url: str = Field(min_length=1, max_length=512)
    admin_username: str = Field(min_length=1, max_length=255)
    admin_password: str = Field(min_length=1, max_length=255)
    default_namespace: str = Field(default='default', min_length=1, max_length=63)
    verify_ssl: bool = True


class ComputeConnectionDelete(BaseModel):
    name: str = Field(min_length=1, max_length=128)


class ComputeConnectionResponse(BaseModel):
    name: str
    api_server_url: str
    admin_username: str
    default_namespace: str
    verify_ssl: bool


class ComputeContainerEnv(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    value: str = Field(default='')


class ComputeContainerCreate(BaseModel):
    image: str = Field(min_length=1, max_length=255)
    container_name: str = Field(min_length=1, max_length=63)
    namespace: str | None = Field(default=None, min_length=1, max_length=63)
    command: list[str] | None = None
    args: list[str] | None = None
    env: list[ComputeContainerEnv] = Field(default_factory=list)
    container_port: int | None = Field(default=None, ge=1, le=65535)


class ComputeContainerCreateResponse(BaseModel):
    app_id: str
    app_key: str
    connection_name: str
    namespace: str
    pod_name: str
    image: str
    status: str = 'created'
