import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    "name": "Expressions",
    "slug": "expressions",
    "category": "Runtime",
    "summary": "Evaluates a safe JavaScript expression subset against the XML runtime scope.",
    "usage": "Use expressions for conditions, derived values, request payloads, query paths, and bindings.",
    "attributesTitle": "Rules",
    "attributes": [
        {
            "name": "$path",
            "description": "Reads a runtime value and creates writable control bindings."
        },
        {
            "name": "${...}",
            "description": "Evaluates a typed expression when the entire value is wrapped."
        },
        {
            "name": "mixed interpolation",
            "description": "Interpolates ${...} segments into a string value."
        },
        {
            "name": "allowed calls",
            "description": "Boolean, Number, String, Array.isArray, and selected Math helpers are allowed."
        }
    ],
    "example": "<TextInput label=\"Name\" value=\"$form.name\" />\n<Button isDisabled=\"${!form.name || form.saving}\" label=\"Save\" />\n<Link to=\"/orders/${params.order}\" label=\"Open order\" />"
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/expressions.tsx',
};
