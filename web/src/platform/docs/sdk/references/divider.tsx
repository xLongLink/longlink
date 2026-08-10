import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    "name": "Divider",
    "slug": "divider",
    "category": "Layout",
    "summary": "Separates related regions with a rule.",
    "usage": "Use Divider when spacing alone is not enough to show a boundary.",
    "attributes": [
        {
            "name": "orientation",
            "description": "horizontal or vertical."
        },
        {
            "name": "variant",
            "description": "subtle or strong."
        },
        {
            "name": "label or i18n",
            "description": "Optional divider label."
        }
    ],
    "example": "<Divider i18n=\"common.or\" variant=\"strong\" />"
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/divider.tsx',
};
