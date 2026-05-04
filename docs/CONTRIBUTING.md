## Architecture

```text
docs/
├── src/
│   ├── api/           # Control plane documentation
│   │   ├── index.md
│   │   └── self-hosted.md
│   ├── sdk/           # SDK documentation
│   │   ├── index.md
│   │   ├── building.md
│   │   ├── database.md
│   │   ├── environments.md
│   │   ├── routes.md
│   │   ├── storage.md
│   │   └── testing.md
│   ├── xml/           # XML page documentation
│   │   ├── index.md
│   │   ├── components.md
│   │   ├── html.md
│   │   ├── layout.md
│   │   └── primitives.md
│   ├── public/        # Public assets
│   │   ├── favicon.ico
│   │   ├── image.png
│   │   └── schema.xsd
│   └── index.md       # Documentation entry
└── .vitepress/        # VitePress configuration
```

## Writing rules

- Use short, concrete sentences.
- Prefer explicit nouns over ambiguous pronouns.
- Avoid marketing language.
- Explain responsibilities clearly (control plane vs SDK vs application).
- Use consistent terms (`application`, `control plane`, `SDK`, `API`, `XML page`).
- Avoid unnecessary jargon; explain specialized terms briefly.
- Describe ownership explicitly. Avoid ambiguous `we`.
- Use `You` for reader actions and `LongLink` for platform behavior.
