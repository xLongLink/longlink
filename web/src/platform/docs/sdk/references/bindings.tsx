import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    "name": "Bindings",
    "slug": "bindings",
    "category": "Runtime",
    "summary": "Connects writable control values to State objects declared in the XML runtime.",
    "usage": "Use bindings when form controls need to edit local page state before an Action sends data.",
    "attributesTitle": "Rules",
    "attributes": [
        {
            "name": "value=\"$state.path\"",
            "description": "Binds a control value to a State object field.",
            "required": true
        },
        {
            "name": "safe names",
            "description": "State ids and path segments must be safe property names."
        },
        {
            "name": "unbound values",
            "description": "Literal and computed values render as local control state only."
        }
    ],
    "example": "<State id=\"form\" name=\"\" active=\"true\" />\n\n<TextInput label=\"Name\" value=\"$form.name\" />\n<Switch label=\"Active\" value=\"$form.active\" />"
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/bindings.tsx',
};
