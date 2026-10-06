<div align="center">

<img src="https://raw.githubusercontent.com/xLongLink/longlink/main/banner.png" alt="LongLink banner" />

[![PyPI version](https://img.shields.io/pypi/v/longlink)](https://pypi.org/project/longlink/)
[![Python versions](https://img.shields.io/pypi/pyversions/longlink)](https://pypi.org/project/longlink/)
[![License](https://img.shields.io/github/license/xLongLink/longlink)](https://github.com/xLongLink/longlink/blob/main/LICENSE)

[Website](https://www.longlink.dev/) &nbsp; - &nbsp; [Docs](https://www.longlink.dev/docs/introduction/) &nbsp; - &nbsp; [Issues](https://github.com/xLongLink/longlink/issues)

</div>

> [!WARNING]
> LongLink is under active development. APIs may change before 1.0.

<br/>

## Getting started

```bash
uvx --from longlink longlink init --folder .
uv sync --group dev
uv run longlink dev
```

> See [`xLongLink/sample`](https://github.com/xLongLink/sample) for a minimal LongLink Solution.

<br />

## Documentation

Check [LongLink Documentation](https://www.longlink.dev/docs/sdk/) or use the `cli` (designed for agents):

```bash
longlink docs --help
```

### HTML-style forms

Use named fields instead of maintaining draft state:

```jsx
/** Creates an item through the Solution request bridge. */
export default function CreateItem() {
    return (
        <Form action="/api/items" method="post">
            <Stack gap={3}>
                <TextInput name="name" label="Name" required />
                <NumberInput name="price" label="Price" min={0} defaultValue={0} required />
                <Button type="submit" label="Create" />
            </Stack>
        </Form>
    );
}
```

`name` keeps the themed Astryx control and includes its value in form submissions.
Use `defaultValue` or `defaultChecked` for initial values, or `value` and `onChange`
when the interface needs reactive state. Ordinary HTML inputs also work inside `Form`.

Receive the fields with `payload: Annotated[ItemCreate, fastapi.Form()]` in your Python
route (`Annotated` comes from `typing`; install `python-multipart`). Form validation
provides immediate feedback; the backend schema validates and parses submitted strings.
Repeated names and files are preserved, and unchecked checkboxes are omitted.

`Form` prevents duplicate submissions and displays request errors. Successful writes
refresh cached View data but do not reset the form. Use `onSuccess` to close a dialog
or navigate, or a reset button to restore defaults.

<br/>

## Development

```bash
make sdk
```

> Requirements: Python 3.12 or newer, `uv`, and Docker if you want to build an image. See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for more details.

<br/>

## Testing

```bash
uv sync --group dev
uv run pytest --cov --cov-report=term-missing
```

<br/>
<br/>

---

<div align="center">
LongLink 2026

[License](./LICENSE) &nbsp; - &nbsp; [Contributing](./CONTRIBUTING.md) &nbsp; - &nbsp; [Code of Conduct](../CODE_OF_CONDUCT.md) &nbsp; - &nbsp; [Contact](mailto:info@longlink.dev)

</div>

---
