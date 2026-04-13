from pydantic import Field, BaseModel


class ComputeUsageSummary(BaseModel):
    running_pods: int = 0
    namespaces: int = 0
    free_bytes: int | None = None


class ComputeConfigSummary(BaseModel):
    api_server_url: str
    admin_username: str
    default_namespace: str
    verify_ssl: bool


class ComputeSummaryResponse(BaseModel):
    configured: bool
    config: ComputeConfigSummary | None = None
    usage: ComputeUsageSummary = ComputeUsageSummary()


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
