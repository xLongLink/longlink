from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "adapters" / "Hero.xsd"


def test_hero_validation() -> None:
    """Validate a minimal `Hero` fragment with its slot children."""

    element = Element.from_content(
        """
        <Hero icon="layout-grid">
          <HeroTitle i18n="Orgs" />
          <HeroDescription i18n="Browse the orgs you belong to." />
          <HeroContent>
            <Button action="/orgs/new" i18n="Create org" />
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
