from pydantic import Field, BaseModel


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
    namespace: str
    pod_name: str
    image: str
    status: str = 'created'
