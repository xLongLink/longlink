import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

FIELD_SET_SCHEMA = ROOT / ".static" / "xsd" / "schema.xsd"
FIELD_SCHEMA = ROOT / ".static" / "xsd" / "adapters" / "Field.xsd"


def test_field_validation() -> None:
    """Validate a compound `Field` fragment."""

    element = Element.from_content(
        """
        <Grid columns="2">
          <Field>
            <FieldContent>
              <FieldTitle i18n="Full name" />
            </FieldContent>
            <FieldLabel htmlFor="name" i18n="Full name" />
            <Input id="name" autoComplete="off" placeholder="Evil Rabbit" />
          </Field>
          <Field>
            <FieldLabel htmlFor="username" i18n="Username" />
            <Input id="username" autoComplete="off" aria-invalid="true" />
          </Field>
          <Field orientation="horizontal">
            <Switch id="newsletter" />
            <FieldLabel htmlFor="newsletter" i18n="Subscribe to the newsletter" />
          </Field>
        </Grid>
        """,
        schema=FIELD_SET_SCHEMA,
    )

    element.validate()


def test_field_rejects_unknown_attributes() -> None:
    """Reject attributes that are not allowed on `Field`."""

    element = Element.from_content('<Field tone="accent" />', schema=FIELD_SCHEMA)

    with pytest.raises(ValueError):
        element.validate()
