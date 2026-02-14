from typing import Annotated, Literal

from pydantic import BaseModel, Field


class Component(BaseModel):
    type: str


class Hero(Component):
    type: Literal['hero'] = 'hero'
    title: str
    description: str
    icon: str | None = None


PageComponent = Annotated[Hero, Field(discriminator='type')]


class Page(BaseModel):
    title: str
    description: str
    components: list[PageComponent]
