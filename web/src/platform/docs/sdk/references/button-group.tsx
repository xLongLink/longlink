import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    "name": "ButtonGroup",
    "slug": "button-group",
    "category": "Action",
    "summary": "Groups related buttons under one accessible label.",
    "usage": "Use ButtonGroup when several adjacent commands form one connected control.",
    "attributes": [
        {
            "name": "label or i18n",
            "description": "Accessible group label.",
            "required": true
        },
        {
            "name": "orientation",
            "description": "horizontal or vertical."
        },
        {
            "name": "size",
            "description": "sm, md, or lg."
        },
        {
            "name": "isDisabled",
            "description": "Disables every grouped button."
        }
    ],
    "children": "Button and Action children.",
    "example": "<ButtonGroup label=\"Order actions\">\n  <Button label=\"Copy\" />\n  <Button label=\"Paste\" />\n</ButtonGroup>"
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/button-group.tsx',
};
