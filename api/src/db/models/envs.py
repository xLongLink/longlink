from sqlmodel import Field
from src.db.models.__base__ import Base


class Env(Base, table=True):
    '''Represent an application secret environment variable.
    Envs are stored as secrets and injected in the app container as environment variables.
    '''
    __tablename__ = 'envs'

    id: int | None = Field(default=None, primary_key=True)

    # Property
    key: str = Field(max_length=128)
    value: str
    appname: str = Field(foreign_key='apps.name')
