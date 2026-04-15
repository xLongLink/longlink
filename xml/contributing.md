# Contributing in `xml/`

Thanks for improving the ReactXML runtime.

## What this folder owns

A focused XML-to-React runtime pipeline:

- compiler
- runtime
- primitives
- renderer
- registry
- shared types

## Keep changes aligned

- Keep XML structure concerns separate from runtime evaluation.
- Keep runtime evaluation separate from React rendering.
- Keep changes concise and local to the right pipeline stage.
- Prefer the current model over backward compatibility.
- Remove obsolete code when introducing new behavior.
- Do not add tests right now (current project rule).
