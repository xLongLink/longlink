import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    "name": "TableColumn",
    "slug": "table-column",
    "category": "Table & List",
    "summary": "Declares one column inside a Table.",
    "usage": "Use TableColumn to define column headers, fields, and custom cell content.",
    "attributes": [
        {
            "name": "key",
            "description": "Stable column key.",
            "required": true
        },
        {
            "name": "header or i18n",
            "description": "Column header text.",
            "required": true
        },
        {
            "name": "field",
            "description": "Property path read from the row item."
        },
        {
            "name": "width",
            "description": "Column width."
        },
        {
            "name": "align",
            "description": "start, center, or end."
        }
    ],
    "children": "Optional custom cell content rendered for each row.",
    "example": "<TableColumn key=\"status\" header=\"Status\">\n  <Badge label=\"$order.status\" variant=\"info\" />\n</TableColumn>"
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/table-column.tsx',
};
