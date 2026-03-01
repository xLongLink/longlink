# Menu, MenuSection, and MenuSubSection

The menu elements define hierarchical navigation.

## Menu
- Root navigation container.
- Holds ordered `MenuSection` entries.
- Serializes as `type: menu`.

## MenuSection
- First-level group in the menu.
- Can contain direct pages/actions and nested subsections.
- Serializes as `type: menu-section`.

## MenuSubSection
- Nested grouping level under a section.
- Used to structure larger navigation trees.
- Serializes as `type: menu-sub-section`.
