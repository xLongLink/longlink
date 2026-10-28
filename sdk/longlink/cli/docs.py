import re
from pydantic import Field, BaseModel, JsonValue
from rapidfuzz import fuzz
from longlink.cli import errors
from collections.abc import Sequence
from longlink.constants import ROOT


class Property(BaseModel):
    """A supported View component property."""

    # Public property contract.
    name: str
    type: str
    default: JsonValue = None
    description: str = ""


class Member(BaseModel):
    """A callable in a documented runtime collection."""

    # Runtime member contract.
    name: str
    description: str


class Component(BaseModel):
    """Generated documentation for a public View API."""

    # Identity and authored guidance.
    name: str
    category: str
    guidance: str = ""
    keywords: list[str] = Field(default_factory=list)
    introduction: str

    # Supported API surface.
    members: list[Member] = Field(default_factory=list)
    properties: list[Property] = Field(default_factory=list)


class Pattern(BaseModel):
    """An authored implementation outline, not a JSX template."""

    # Intent and recommended APIs.
    name: str
    steps: list[str]
    keywords: list[str]
    components: list[str]
    description: str


class Catalog(BaseModel):
    """Generated APIs, category overviews, and supported interface patterns."""

    # Navigation and task guidance.
    groups: dict[str, str]
    patterns: list[Pattern]
    components: list[Component]


def catalog() -> Catalog:
    """Read and validate the packaged catalog shared with the website."""

    # Validate generated documentation at the file boundary.
    source = (ROOT / ".static" / "jsx" / "components.json").read_text(encoding="utf-8")
    return Catalog.model_validate_json(source)


def score(query: str, name: str, keywords: list[str], description: str) -> float:
    """Rank explicit intent ahead of prose, with typo tolerance only for short lookups."""

    # Normalize CamelCase names and punctuation into searchable words.
    query = " ".join(re.findall(r"\w+", query.casefold()))
    name = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", name).casefold()
    names = [name, name.replace(" ", "")]
    phrases = [keyword.casefold() for keyword in keywords]
    if query in names:
        return 1000
    if query in phrases:
        return 900

    # Prefer full multiword phrases to individual term matches.
    if any(len(phrase.split()) >= 2 and f" {phrase} " in f" {query} " for phrase in [*names, *phrases]):
        return 600

    # Reward multi-word coverage without letting incidental prose outrank intent.
    terms = query.split()
    words = " ".join([*names, *phrases]).split()
    prose = set(re.findall(r"\w+", description.casefold()))
    weights = []
    for term in terms:
        if term in words:
            weights.append(100)

        # Partial words rank below exact terms and above prose-only matches.
        elif len(term) >= 3 and any(word.startswith(term) for word in words):
            weights.append(70)

        # Prose-only matches rank below names and explicit keywords.
        elif term in prose:
            weights.append(20)
        else:
            weights.append(0)

    # Reward queries whose every term matches a name or keyword.
    relevance = sum(weights) / len(terms)
    if all(weight >= 70 for weight in weights):
        relevance += 200

    # Keep fuzzy fallback below explicit matches and out of sentence/prose matching.
    if len(terms) == 1 and len(query) >= 4:
        similarity = max((fuzz.ratio(query, word) for word in words), default=0)
        if similarity >= 80:
            relevance = max(relevance, similarity / 2)
    return relevance


def validate_query(query: str) -> str:
    """Reject empty or punctuation-only queries at the CLI boundary."""

    # Require at least one searchable term before ranking.
    query = query.strip()
    if not re.search(r"\w", query):
        raise errors.Error("Provide a non-empty query, or run `longlink docs` to browse groups.")
    return query


def search(query: str, components: Sequence[Component]) -> list[Component]:
    """Return the best documented API matches for a validated query."""

    # Include callable names as explicit search signals for runtime collections.
    ranked = []
    for component in components:
        keywords = [*component.keywords, *(member.name.split("(")[0] for member in component.members)]
        description = " ".join([component.introduction, component.guidance, *(member.description for member in component.members)])
        relevance = score(query, component.name, keywords, description)
        if relevance >= 15:
            ranked.append((relevance, component))

    # Resolve equal relevance deterministically before limiting suggestions.
    ranked.sort(key=lambda match: (-match[0], match[1].name))
    return [component for _, component in ranked[:6]]


def render_matches(components: Sequence[Component]) -> None:
    """Print concise API matches and exact follow-up commands."""

    # Keep detailed property documentation out of discovery output.
    for component in components:
        print(f"\n{component.name} [{component.category}]")
        if component.introduction:
            print(component.introduction)
        print(f"  longlink docs component {component.name}")


def docs_command() -> None:
    """Show the View-authoring playbook and available groups."""

    # Render the playbook when no documentation subcommand was requested.
    documentation = catalog()
    print("LongLink JSX View components")
    print("Export one default React component from each .jsx file; no package imports or frontend build is required.")
    print("Use React state and controlled callbacks; express queries and ordered actions in ordinary JavaScript.")
    print("Source runs in an opaque-origin sandbox. Requests target the current Solution; external navigation requires user activation.")
    print("Keep business rules, validation, and authorization on the Solution server.")
    print('\n1. Discover APIs: longlink docs search "<query>"')
    print('2. Plan an interface: longlink docs build "<idea>"')
    print("3. Inspect supported props: longlink docs component <name>")

    # List documented categories without dumping their complete API surfaces.
    print("\nGroups")
    for category in sorted({component.category for component in documentation.components}):
        print(f"- {category}: {documentation.groups[category]}")
        print(f"  longlink docs group {category}")


def component_command(name: str, /) -> None:
    """Show an API's introduction, props, defaults, and runtime members.

    Parameters
    ----------
    name
        Public component or runtime collection name.

    """

    # Resolve the public entry case-insensitively before rendering its contract.
    component = next((component for component in catalog().components if component.name.casefold() == name.strip().casefold()), None)
    if component is None:
        raise errors.Error(f'Unknown component: {name}. Run `longlink docs search "{name}"` to find available APIs.')
    print(f"{component.name} [{component.category}]")
    if component.introduction:
        print(component.introduction)

    # Keep usage guidance separate from the component introduction.
    if component.guidance:
        print(f"\nUsage: {component.guidance}")

    # Preserve generated defaults and grouped property names in the detail output.
    for member in component.members:
        print(f"\n- {member.name}:\n  {member.description}")
    for prop in component.properties:
        print(f"\n- {prop.name} ({prop.type}):\n  {prop.description}")
        if "default" in prop.model_fields_set:
            print(f"  Default: {prop.default!r}")

    # Distinguish a prop-free component from missing documentation.
    if not component.members and not component.properties:
        print("No props.")


def group_command(name: str, /) -> None:
    """Show a category overview and its available APIs.

    Parameters
    ----------
    name
        Category name, such as Form or Layouts.

    """

    # Keep the category lookup and existence check together at the CLI boundary.
    documentation = catalog()
    categories = sorted({component.category for component in documentation.components})
    category = next((category for category in categories if category.casefold() == name.strip().casefold()), None)
    if category is None:
        raise errors.Error(f"Unknown group: {name}. Available groups: {', '.join(categories)}.")
    print(f"{category}\n{documentation.groups[category]}")
    render_matches([component for component in documentation.components if component.category == category])


def search_command(query: str, /) -> None:
    """Find relevant View APIs using keywords and typo-tolerant name matching.

    Parameters
    ----------
    query
        Words describing the API you need.

    """

    # Validate input before searching the shared catalog.
    query = validate_query(query)
    matches = search(query, catalog().components)
    print(f'Search results for "{query}"')
    if not matches:
        print("No matches. Try other words, or run `longlink docs` to browse groups.")
        return
    render_matches(matches)


def build_command(query: str, /) -> None:
    """Recommend APIs and an authored approach without generating code or templates.

    Parameters
    ----------
    query
        Interface idea, such as an approval queue.

    """

    # Reuse API search and rank authored patterns by explicit intent only.
    query = validate_query(query)
    documentation = catalog()
    best = max(
        ((score(query, pattern.name, pattern.keywords, ""), pattern) for pattern in documentation.patterns),
        key=lambda match: match[0],
        default=None,
    )
    pattern = best[1] if best is not None and best[0] >= 70 else None
    print(f'Build guidance for "{query}"')

    # Use only verified pattern references; unknown ideas get search results, not invented guidance.
    if pattern is not None:
        print(f"\nApproach: {pattern.name}\n{pattern.description}")
        for index, step in enumerate(pattern.steps, start=1):
            print(f"{index}. {step}")
        matches = [next(component for component in documentation.components if component.name == name) for name in pattern.components]
    else:

        # Search results are useful even when no curated workflow matches.
        print("\nNo specific workflow guidance matches this idea. These are documentation matches, not a complete implementation plan.")
        matches = search(query, documentation.components)
    print("\nRelevant APIs")
    if matches:
        render_matches(matches)
    else:
        print("No matches. Run `longlink docs` to browse groups.")
    print("\nUse only documented View APIs; enforce business rules and authorization on the Solution server.")
