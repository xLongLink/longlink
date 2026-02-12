from pydantic import BaseModel
from pydantic import Field
from pydantic import ConfigDict


class FormValidation(BaseModel):
    pattern: str | None = None
    minLength: int | None = None
    maxLength: int | None = None


class FormComponent(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    type: str
    name: str
    label: str
    description: str | None = None
    placeholder: str | None = None
    required: bool = False
    default: str = ''
    validation: FormValidation | None = Field(default=None, alias='validate')
    error: str | None = None


class FormSampleResponse(BaseModel):
    title: str
    description: str
    components: list[FormComponent]
