import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    "name": "TabList",
    "slug": "tab-list",
    "category": "Navigation",
    "summary": "Renders flat tab navigation.",
    "usage": "Use TabList for switching between related page views.",
    "attributes": [
        {
            "name": "label or i18n",
            "description": "Accessible tab list label.",
            "required": true
        },
        {
            "name": "value",
            "description": "Selected tab value."
        },
        {
            "name": "size",
            "description": "sm, md, or lg."
        },
        {
            "name": "hasDivider",
            "description": "Shows a divider under the tabs."
        }
    ],
    "children": "Tab children.",
    "example": "<TabList label=\"Order views\" value=\"overview\">\n  <Tab value=\"overview\" label=\"Overview\" />\n  <Tab value=\"activity\" label=\"Activity\" />\n</TabList>"
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/tab-list.tsx',
};
