import re
import html
from lxml import etree
from typing import Never, override
from functools import cache
from html.parser import HTMLParser
from longlink.constants import ROOT

ATTRIBUTE_PATTERN = re.compile(r"""\s+([A-Za-z_][\w.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')""")
ENTITY_PATTERN = re.compile(r"&(?:amp|lt|gt|quot|apos|#(?:[0-9]+|[xX][0-9a-fA-F]+));")


def _decode(value: str) -> str:
    """Decode explicit XML character references without interpreting arbitrary ampersands."""

    # Match the browser parser's XML-mode character reference rules.
    return ENTITY_PATTERN.sub(lambda match: html.unescape(match.group()), value)


@cache
def _load_schema() -> etree.XMLSchema:
    """Compile the component constraints shared with the documentation catalog."""

    # Read bundled schema assets without resolving external entities or network resources.
    return etree.XMLSchema(
        etree.parse(
            str(ROOT / ".static" / "xsd" / "schema.xsd"),
            etree.XMLParser(load_dtd=False, no_network=True, resolve_entities=False),
        )
    )


class _ViewParser(HTMLParser):
    """Build a case-sensitive component tree from permissive View markup."""

    def __init__(self, content: str) -> None:
        """Store source locations and disable automatic text entity conversion."""

        # Keep raw source available because HTMLParser normalizes element and attribute names.
        super().__init__(convert_charrefs=False)
        self.content = content
        self.roots: list[etree._Element] = []
        self.stack: list[etree._Element] = []
        self.lines = content.split("\n")

    def _invalid(self, message: str) -> Never:
        """Report malformed View markup at the current parser position."""

        # Include source locations in startup validation failures.
        line, column = self.getpos()
        raise ValueError(f"View syntax is invalid at line {line}, column {column + 1}: {message}")

    def _source(self) -> str:
        """Return the original source starting at the current parser callback."""

        # Translate HTMLParser's line and column into a document offset.
        line, column = self.getpos()
        offset = sum(len(value) + 1 for value in self.lines[: line - 1]) + column
        return self.content[offset:]

    def _start_element(self) -> None:
        """Preserve source casing and require explicit quoted attribute values."""

        # Read the complete opening tag through the standard-library tokenizer.
        source = self.get_starttag_text()
        if source is None:
            self._invalid("Missing opening tag")
        match = re.match(r"<([A-Za-z_][\w.-]*)", source)
        if match is None:
            self._invalid("Invalid component name")
        name = match.group(1)
        attributes = source[match.end() : -2 if source.endswith("/>") else -1]
        values: dict[str, str] = {}
        cursor = 0

        # Validate attribute boundaries while preserving their original names and raw operators.
        while attributes[cursor:].strip():
            attribute = ATTRIBUTE_PATTERN.match(attributes, cursor)
            if attribute is None:
                self._invalid("Attributes must have quoted values")
            key = attribute.group(1)
            if key in values:
                self._invalid(f'Duplicate attribute "{key}"')
            values[key] = _decode(attribute.group(2) if attribute.group(2) is not None else attribute.group(3))
            cursor = attribute.end()

        # Build an in-memory schema-validation tree without reparsing the source as XML.
        element = etree.Element(name, values)
        if self.stack:
            self.stack[-1].append(element)
        else:
            self.roots.append(element)
        self.stack.append(element)

    @override
    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        """Open one component without applying HTML tree-repair rules."""

        # Ignore normalized names and attributes in favor of the original opening tag.
        self._start_element()

    @override
    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        """Close a component only when its source explicitly uses self-closing syntax."""

        # Open and immediately close the same component.
        self._start_element()
        self.stack.pop()

    @override
    def handle_endtag(self, tag: str) -> None:
        """Require explicit, case-sensitive and correctly nested closing tags."""

        # Validate the original closing tag rather than the normalized callback name.
        match = re.match(r"</([A-Za-z_][\w.-]*)\s*>", self._source())
        if match is None or not self.stack or self.stack[-1].tag != match.group(1):
            self._invalid("Unexpected closing tag")
        self.stack.pop()

    def _append_text(self, value: str) -> None:
        """Attach text to the current element or its last child's tail."""

        # Only whitespace may appear outside the single View root.
        if not self.stack:
            if value.strip():
                self._invalid("Views must contain exactly one view root")
            return
        element = self.stack[-1]

        # Preserve mixed content for the existing component schema constraints.
        if len(element):
            child = element[-1]
            child.tail = (child.tail or "") + value
        else:
            element.text = (element.text or "") + value

    def handle_data(self, data: str) -> None:
        """Preserve text while rejecting incomplete tags recovered as text by HTMLParser."""

        # Literal less-than signs in text must use a character reference; quoted attributes allow them raw.
        if "<" in data:
            self._invalid("Incomplete markup")
        self._append_text(data)

    def handle_entityref(self, name: str) -> None:
        """Decode supported explicit named character references."""

        # Preserve unknown or unterminated references exactly as written.
        value = f"&{name}"
        if self._source().startswith(f"{value};"):
            value += ";"
        self._append_text(_decode(value))

    def handle_charref(self, name: str) -> None:
        """Decode explicit numeric character references."""

        # Use the same source-preserving decoding for numeric and named references.
        self.handle_entityref(f"#{name}")

    @override
    def handle_decl(self, decl: str) -> None:
        """Reject document declarations in View files."""

        # Views do not load document types or entity definitions.
        self._invalid("View DOCTYPE, ENTITY, and CDATA constructs are not supported")

    @override
    def handle_comment(self, data: str) -> None:
        """Ignore real comments without accepting declarations recovered as bogus comments."""

        # HTMLParser reports unknown declarations through its comment callback.
        source = self._source()
        closing = re.search(r"--\s*>", source)
        if not source.startswith("<!--"):
            self._invalid("View DOCTYPE, ENTITY, and CDATA constructs are not supported")
        if closing is None or closing.group() != "-->":
            self._invalid("Unclosed comment")

    @override
    def handle_pi(self, data: str) -> None:
        """Reject processing instructions in View files."""

        # XML declarations and schema hints no longer belong in Views.
        self._invalid("Declarations and processing instructions are not supported")

    @override
    def unknown_decl(self, data: str) -> None:
        """Reject CDATA and other declaration syntax."""

        # Do not allow declarations to bypass component validation.
        self._invalid("View DOCTYPE, ENTITY, and CDATA constructs are not supported")


def validate_view(content: str) -> etree._Element:
    """Parse View markup and validate its component tree against the shared constraints."""

    # Parse raw View source without executing expressions or requiring XML escaping.
    parser = _ViewParser(
        content=content,
    )
    parser.feed(content)
    parser.close()
    if parser.stack:
        raise ValueError("View syntax is invalid: Missing closing tag")
    if len(parser.roots) != 1 or parser.roots[0].tag != "view":
        raise ValueError("View is invalid: Views must contain exactly one view root")
    root = parser.roots[0]

    # Reuse component constraints on the parsed tree, not on the non-XML source document.
    try:
        _load_schema().assertValid(root)
    except etree.DocumentInvalid as error:
        details = "; ".join(f"Line {entry.line}: {entry.message}" for entry in error.error_log)
        raise ValueError(f"View is invalid: {details}") from error

    return root
