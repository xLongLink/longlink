# Contributing in `docs/`

Thanks for improving LongLink documentation.

## Architecture

```text
docs/
├── src/
│   ├── api/           # Control plane API documentation
│   ├── sdk/           # Application SDK documentation
│   ├── public/        # Public assets
│   └── index.md       # Documentation entry
└── .vitepress/        # VitePress configuration
```

## Goal

Write docs clear, direct, easy to translate.

## Writing rules

- Use short, concrete sentences.
- Prefer explicit nouns over ambiguous pronouns.
- Avoid marketing language.
- Explain responsibilities clearly (control plane vs SDK vs application).
- Use consistent terms (`application`, `control plane`, `SDK`, `API`, `XML page`).
- Avoid unnecessary jargon; explain specialized terms briefly.
- Describe ownership explicitly. Avoid ambiguous `we`.
- Use `You` for reader actions and `LongLink` for platform behavior.

## Recommended page structure

When relevant, follow the format:

````md
# <Feature>

<Introduction>

## Usage

```py
<Minimal usage examples>
```
````

## Resources

- [Description](url)

```

```
