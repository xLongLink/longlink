import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    "name": "SideNavItem",
    "slug": "side-nav-item",
    "category": "Navigation",
    "summary": "Defines one destination inside a SideNav.",
    "usage": "Use SideNavItem only as a child of SideNav.",
    "attributes": [
        {
            "name": "value",
            "description": "Destination path.",
            "required": true
        },
        {
            "name": "label or i18n",
            "description": "Visible navigation label.",
            "required": true
        },
        {
            "name": "icon",
            "description": "Optional icon name."
        }
    ],
    "example": "<SideNavItem value=\"/orders\" label=\"Orders\" icon=\"clipboard-list\" />"
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/side-nav-item.tsx',
};
