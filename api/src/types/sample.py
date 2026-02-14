from pydantic import BaseModel


class HeroComponent(BaseModel):
    type: str = 'hero'
    title: str
    description: str
    icon: str | None = None


class PageSampleResponse(BaseModel):
    title: str
    description: str
    components: list[HeroComponent]
