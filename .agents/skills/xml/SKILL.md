---
name: xml
description: Guide LongLink XML component creation and maintenance across SDK, web runtime, tests, and docs
---

## Structure

```text
longlink/
├── sdk/
│   ├── longlink/
│   │   ├── .static/xsd/         # XML schema definitions
│   │   │   ├── base.xsd         # Shared schema base
│   │   │   ├── components/      # Component contracts
│   │   │   │   ├── Card.xsd     # Card contract
│   │   │   │   ├── Columns.xsd  # Columns contract
│   │   │   │   ├── Dialog.xsd   # Dialog contract
│   │   │   │   ├── Hero.xsd     # Hero contract
│   │   │   │   ├── Menu.xsd     # Menu contract
│   │   │   │   ├── Range.xsd    # Range contract
│   │   │   │   ├── Select.xsd   # Select contract
│   │   │   │   ├── Separator.xsd # Separator contract
│   │   │   │   ├── Slider.xsd   # Slider contract
│   │   │   │   ├── Switch.xsd   # Switch contract
│   │   │   │   ├── Tabs.xsd     # Tabs contract
│   │   │   │   └── Textarea.xsd  # Textarea contract
│   │   │   ├── layout/          # Layout contracts
│   │   │   │   ├── For.xsd      # Loop contract
│   │   │   │   ├── Page.xsd     # Page contract
│   │   │   │   ├── Query.xsd    # Query contract
│   │   │   │   └── State.xsd    # State contract
│   │   │   ├── html/            # HTML bridge contracts
│   │   │   │   ├── h1.xsd       # Heading 1 contract
│   │   │   │   ├── h2.xsd       # Heading 2 contract
│   │   │   │   ├── h3.xsd       # Heading 3 contract
│   │   │   │   ├── h4.xsd       # Heading 4 contract
│   │   │   │   ├── blockquote.xsd # Blockquote contract
│   │   │   │   ├── li.xsd       # List item contract
│   │   │   │   ├── p.xsd        # Paragraph contract
│   │   │   │   └── ul.xsd       # Unordered list contract
│   │   │   └── tables/          # Table-related contracts
│   │   │       ├── Table.xsd    # Table contract
│   │   │       ├── TableBody.xsd # Table body contract
│   │   │       ├── TableCell.xsd # Table cell contract
│   │   │       ├── TableHead.xsd # Table head contract
│   │   │       ├── TableHeader.xsd # Table header contract
│   │   │       └── TableRow.xsd  # Table row contract
│   │   ├── routes/              # XML page metadata and page routes
│   │   │   ├── metadata.py      # Metadata route helpers
│   │   │   └── pages.py         # Page route helpers
│   │   ├── utils/               # XML helpers and page utilities
│   │   │   ├── xml.py           # XML utility helpers
│   │   │   ├── metadata.py      # Metadata utilities
│   │   │   └── page.py          # Page utilities
│   │   ├── app.py               # SDK app entrypoint
│   │   ├── router.py            # SDK router wiring
│   │   └── constants.py         # Shared SDK constants
│   └── tests/xml/               # SDK XML tests
│       ├── components/          # Component behavior tests
│       │   ├── test_button.py   # Button coverage
│       │   ├── test_card.py     # Card coverage
│       │   ├── test_checkbox.py # Checkbox coverage
│       │   ├── test_column.py   # Column coverage
│       │   ├── test_columns.py  # Columns coverage
│       │   ├── test_dialog.py   # Dialog coverage
│       │   ├── test_dialog_content.py # Dialog content coverage
│       │   ├── test_dialog_description.py # Dialog description coverage
│       │   ├── test_dialog_footer.py # Dialog footer coverage
│       │   ├── test_dialog_header.py # Dialog header coverage
│       │   ├── test_dialog_title.py # Dialog title coverage
│       │   ├── test_dialog_trigger.py # Dialog trigger coverage
│       │   ├── test_grid.py     # Grid coverage
│       │   ├── test_hero.py     # Hero coverage
│       │   ├── test_icon.py     # Icon coverage
│       │   ├── test_input.py    # Input coverage
│       │   ├── test_menu.py     # Menu coverage
│       │   ├── test_menu_section.py # Menu section coverage
│       │   ├── test_menu_sub_section.py # Menu subsection coverage
│       │   ├── test_range.py    # Range coverage
│       │   ├── test_select.py   # Select coverage
│       │   ├── test_separator.py # Separator coverage
│       │   ├── test_slider.py   # Slider coverage
│       │   ├── test_stack.py    # Stack coverage
│       │   ├── test_switch.py   # Switch coverage
│       │   ├── test_tabs.py     # Tabs coverage
│       │   ├── test_tabs_content.py # Tabs content coverage
│       │   ├── test_tabs_list.py # Tabs list coverage
│       │   ├── test_tabs_trigger.py # Tabs trigger coverage
│       │   └── test_textarea.py # Textarea coverage
│       ├── layout/              # Layout behavior tests
│       │   ├── test_for.py      # For behavior coverage
│       │   ├── test_grid.py     # Grid behavior coverage
│       │   ├── test_page.py     # Page behavior coverage
│       │   ├── test_query.py    # Query behavior coverage
│       │   └── test_state.py    # State behavior coverage
│       └── html/                # HTML bridge behavior tests
│           ├── h1.py            # h1 bridge coverage
│           ├── h2.py            # h2 bridge coverage
│           ├── h3.py            # h3 bridge coverage
│           ├── h4.py            # h4 bridge coverage
│           ├── blockquote.py    # blockquote bridge coverage
│           ├── li.py            # li bridge coverage
│           ├── p.py             # p bridge coverage
│           └── ul.py            # ul bridge coverage
├── web/
│   ├── src/xml/                # XML runtime parser/renderer and domain groupings
│   │   ├── components/         # XML components
│   │   ├── layout/             # XML layout primitives
│   │   ├── primitives/         # Low-level XML primitives
│   │   └── html/               # HTML/XML bridge tags
│   ├── src/components/         # Shared UI logic and primitives
│   └── tests/xml/              # Web XML runtime and component rendering behavior
│       ├── components/         # XML component tests
│       ├── layout/             # XML layout tests
│       ├── primitives/         # XML primitive tests
│       └── html/               # HTML/XML bridge tests
├── api/
│   └── src/pages/              # XML pages used by control-plane views
├── sdk/sample/src/pages/       # Sample XML pages and fixtures
│   ├── cart.xml                # Cart sample page
│   ├── dashboard.xml           # Dashboard sample page
│   ├── dashboard/overview.xml  # Dashboard overview sample
│   └── settings.xml            # Settings sample page
└── docs/
    └── src/xml/                # XML documentation pages
        ├── index.md            # XML docs entry
        ├── components.md       # XML components docs
        ├── layout.md           # XML layout docs
        ├── primitives.md       # XML primitives docs
        └── html.md             # XML HTML bridge docs
```

## Responsibilities

- Keep schema, runtime, pages, and docs aligned.
- Verify XML tags and attributes mean the same thing across SDK, web, and docs.
- Check that component placement matches ownership boundaries.
- Check that renderer behavior matches schema contract and page usage.
- Check that sample pages and API pages reflect the final XML shape.
- Check that documentation describes the final behavior, not an intermediate state.
- Remove obsolete XML flow when replacement is complete.
