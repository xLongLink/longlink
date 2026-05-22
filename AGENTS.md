# Role and Objective

Follow repository guidance, preserving current architecture direction, implementing changes aligned with active development model.

## Architecture

```bash
longlink/
├── api/           # Control plane
├── sdk/           # Python SDK
└── web/           # Frontend and documentation
```

## Contributing model

- Keep changes small and clear
- Reduce complexity and remove dead code
- Enforce project conventions, normalize naming, improve readability
- Include two blank lines between function definitions
- Always read folder's `CONTRIBUTING.md` for local contributing rules
- Do not add new helper functions unless they are explicitly needed or requested.
- Python functions must have docstrings, and non-trivial logic blocks must have preceding `# ...` comments.
- JavaScript functions must have JSDoc comments, and non-trivial logic blocks must have preceding `// ...` comments.
- Project is in MVP mode: prefer the current model over backward compatibility, remove obsolete code when replacing old flows
- Always check at the end of the implementation, for potential simplifications.

