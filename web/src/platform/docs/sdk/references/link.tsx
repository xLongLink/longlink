import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    "name": "Link",
    "slug": "link",
    "category": "Action",
    "summary": "Navigates inside a LongLink Application or opens an external URL.",
    "usage": "Use Link for destinations. Use Button for commands.",
    "attributes": [
        {
            "name": "to",
            "description": "Application route destination."
        },
        {
            "name": "href",
            "description": "URL destination."
        },
        {
            "name": "label or i18n",
            "description": "Accessible link text."
        },
        {
            "name": "hasUnderline",
            "description": "Shows an underline."
        },
        {
            "name": "isExternalLink",
            "description": "Marks an external destination."
        }
    ],
    "children": "Optional text content.",
    "example": "<Link to=\"/orders/${order.id}\" label=\"Open order\" hasUnderline=\"true\" />"
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/link.tsx',
};
