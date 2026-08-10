import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    "name": "Page Files",
    "slug": "page-files",
    "category": "Runtime",
    "summary": "Registers XML pages from conventional SDK application source folders.",
    "usage": "Place XML page files under src/pages so the LongLink SDK can discover and serve them.",
    "attributesTitle": "Rules",
    "attributes": [
        {
            "name": "src/pages/index.xml",
            "description": "Registers the browser root route."
        },
        {
            "name": "nested files",
            "description": "Nested page files become nested browser routes."
        },
        {
            "name": "src/i18n",
            "description": "Translation catalogs are served alongside XML pages from the app source tree."
        }
    ],
    "example": "src/\n  pages/\n    index.xml\n    orders.xml\n    orders/[order].xml\n  i18n/\n    en.json"
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/page-files.tsx',
};
