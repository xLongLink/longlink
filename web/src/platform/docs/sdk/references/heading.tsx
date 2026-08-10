import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    "name": "Heading",
    "slug": "heading",
    "category": "Content",
    "summary": "Creates semantic section headings.",
    "usage": "Use Heading to structure XML pages with explicit document hierarchy.",
    "attributes": [
        {
            "name": "level",
            "description": "Heading level from 1 to 6.",
            "required": true
        },
        {
            "name": "label, value, or i18n",
            "description": "Heading text."
        },
        {
            "name": "values",
            "description": "Translation interpolation values."
        },
        {
            "name": "count",
            "description": "ICU plural count."
        }
    ],
    "children": "Optional heading text content.",
    "example": "<Heading level=\"1\" i18n=\"orders.title\" />"
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/heading.tsx',
};
