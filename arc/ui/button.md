---
component: Button
sdk: longlink/ui/button.py
web: src/components/longlink/Button.tsx
---

# Button

`Button` triggers backend-driven actions from the UI.

## Purpose

- Call an app endpoint (`url`) when clicked.
- Optionally open a `Dialog` as a child interaction flow.

## Main properties

- `text` (str): label shown in the button.
- `variant`: visual style (`default`, `outline`, `secondary`, `ghost`, `destructive`, `link`).
- `url` (optional str): backend endpoint to call.

## Behavior

- `.click(url)` sets the backend action endpoint.
- `.dialog(confirm, cancel)` attaches a modal dialog child.
- Serializes as `type: button` with `props` and optional `children`.
