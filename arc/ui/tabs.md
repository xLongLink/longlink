---
component: Tabs
sdk: longlink/ui/tabs.py
web: src/components/longlink/Tabs.tsx
---

# Tabs and Tab

`Tabs` organizes content into switchable views. `Tab` is one named tab panel.

## Tabs
- Maintains ordered tab names.
- Owns child `Tab` components.
- `.tab(name)` appends and returns a tab.
- Serializes as `type: tabs` with `tabs` metadata.

## Tab
- Property: `name`.
- Hosts child components (hero/table/button/columns/input/select/range/etc.).
- Serializes as `type: tab`.
