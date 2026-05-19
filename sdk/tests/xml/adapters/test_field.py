"""Tests for the `Field` XML schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

FIELD_SET_SCHEMA = ROOT / ".static" / "xsd" / "schema.xsd"
FIELD_SCHEMA = ROOT / ".static" / "xsd" / "adapters" / "Field.xsd"


def test_field_validation() -> None:
    """Validate a compound `Field` fragment."""

    element = Element.from_content(
        """
        <FieldSet>
          <FieldLegend>Profile</FieldLegend>
          <FieldDescription>This appears on invoices and emails.</FieldDescription>
          <FieldGroup>
            <Field>
              <FieldContent>
                <FieldTitle>Full name</FieldTitle>
              </FieldContent>
              <FieldLabel htmlFor="name">Full name</FieldLabel>
              <Input id="name" autoComplete="off" placeholder="Evil Rabbit" />
            </Field>
            <Field>
              <FieldLabel htmlFor="username">Username</FieldLabel>
              <Input id="username" autoComplete="off" aria-invalid="true" />
              <FieldError>Choose another username.</FieldError>
            </Field>
            <Field orientation="horizontal">
              <Switch id="newsletter" />
              <FieldLabel htmlFor="newsletter">Subscribe to the newsletter</FieldLabel>
            </Field>
            <FieldSeparator>or</FieldSeparator>
          </FieldGroup>
        </FieldSet>
        """,
        schema=FIELD_SET_SCHEMA,
    )

    element.validate()


def test_field_rejects_unknown_attributes() -> None:
    """Reject attributes that are not allowed on `Field`."""

    element = Element.from_content('<Field tone="accent" />', schema=FIELD_SCHEMA)

    with pytest.raises(ValueError):
        element.validate()
