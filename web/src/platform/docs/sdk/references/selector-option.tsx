import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    "name": "SelectorOption",
    "slug": "selector-option",
    "category": "Data Input",
    "summary": "Defines one option inside a Selector.",
    "usage": "Use SelectorOption only as a direct child of Selector.",
    "attributes": [
        {
            "name": "value",
            "description": "Selected option value.",
            "required": true
        },
        {
            "name": "label or i18n",
            "description": "Visible option text."
        },
        {
            "name": "isDisabled",
            "description": "Disables this option."
        },
        {
            "name": "if",
            "description": "Optional expression that controls whether the option exists."
        }
    ],
    "example": "<SelectorOption value=\"open\" label=\"Open\" />"
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/selector-option.tsx',
};
