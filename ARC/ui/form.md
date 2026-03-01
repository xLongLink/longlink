# Form and FormRow

`Form` is a submission boundary for backend-driven input handling. `FormRow` enables horizontal grouping inside a form.

## Form
- Main properties include form metadata such as labels/actions and submit endpoint.
- Owns child components and emits an atomic submit event.
- Provides helpers to add inputs/selects/buttons and row groups.
- Serializes as `type: form`.

## FormRow
- Lightweight horizontal row container inside a form.
- Used to place related controls side by side.
- Serializes as `type: form-row`.
