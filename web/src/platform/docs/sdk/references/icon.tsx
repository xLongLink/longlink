import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    "name": "Icon",
    "slug": "icon",
    "category": "Content",
    "summary": "Displays a Lucide icon.",
    "usage": "Use Icon for compact visual signals that support nearby text.",
    "attributes": [
        {
            "name": "icon",
            "description": "Lucide icon name such as info, circle-check, triangle-alert, circle-x, search, or wrench.",
            "required": true
        },
        {
            "name": "size",
            "description": "Icon size."
        },
        {
            "name": "color",
            "description": "Theme color role."
        }
    ],
    "example": "<Icon icon=\"info\" size=\"sm\" color=\"accent\" />"
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/icon.tsx',
};
