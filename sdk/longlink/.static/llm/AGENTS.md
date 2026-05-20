# LongLink LLM Instructions

This folder contains instructions for agents that generate or edit LongLink XML.

## Read First

- Use the packaged XSD as the primary guide for XML structure.
- Treat the packaged XSD as authoritative when there is any conflict.
- Keep XML valid against the LongLink schema.
- Preserve exact element names, attribute names, and nesting rules.

## Working Rules

- Root documents use the `<longlink>` element.
- Use only elements and attributes documented by the packaged XSD and XML skill examples.
- Prefer small, explicit XML fragments over speculative structures.
- Do not invent tags, attributes, or namespaces unless the schema allows them.

## Output Quality

- Generate valid XML only.
- Keep examples minimal and directly relevant.
- When unsure, choose the simplest schema-compliant structure.
