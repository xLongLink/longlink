import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    "name": "Table",
    "slug": "table",
    "category": "Table & List",
    "summary": "Displays tabular data from an array.",
    "usage": "Use Table for row-oriented business data with consistent columns.",
    "attributes": [
        {
            "name": "data",
            "description": "Array expression used as table rows.",
            "required": true
        },
        {
            "name": "rowName",
            "description": "Local variable name for custom column children."
        },
        {
            "name": "density",
            "description": "compact, balanced, or spacious."
        },
        {
            "name": "isStriped",
            "description": "Shows alternating row backgrounds."
        },
        {
            "name": "hasHover",
            "description": "Adds row hover styling."
        }
    ],
    "children": "TableColumn children.",
    "example": "<Table data=\"$orders.items\" rowName=\"order\">\n  <TableColumn key=\"number\" header=\"Number\" field=\"number\" />\n  <TableColumn key=\"status\" header=\"Status\" field=\"status\" />\n</Table>"
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/table.tsx',
};
