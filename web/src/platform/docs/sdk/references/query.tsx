import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    "name": "Query",
    "slug": "query",
    "category": "State",
    "summary": "Fetches JSON data before rendering and stores it in the XML runtime scope.",
    "usage": "Use Query for page data that descendants read through expressions, loops, and bindings.",
    "attributes": [
        {
            "name": "id",
            "description": "Literal query name exposed in XML expressions.",
            "required": true
        },
        {
            "name": "path",
            "description": "Application-relative request path.",
            "required": true
        }
    ],
    "children": "Query is setup-only and cannot have children.",
    "example": "<Query id=\"orders\" path=\"/api/orders\" />\n\n<For each=\"$orders.items\" as=\"order\">\n  <Text value=\"$order.number\" />\n</For>"
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/query.tsx',
};
