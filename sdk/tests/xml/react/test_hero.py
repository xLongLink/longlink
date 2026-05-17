"""Tests for the `Hero` XML schema."""

from __future__ import annotations

from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "react" / "Hero.xsd"


def test_hero_validation() -> None:
    """Validate a minimal `Hero` fragment with its slot children."""

    element = Element.from_content(
        """
        <Hero icon="layout-grid">
          <HeroTitle>Organizations</HeroTitle>
          <HeroDescription>Browse the organizations you belong to.</HeroDescription>
          <HeroContent>
            <Button action="/organizations/new">Create organization</Button>
          </HeroContent>
        </Hero>
        """,
        schema=SCHEMA,
    )

    element.validate()


def test_hero_allows_if_attribute() -> None:
    """Allow the schema-supported `if` attribute on `Hero`."""

    element = Element.from_content('<Hero if="show" />', schema=SCHEMA)

    element.validate()
