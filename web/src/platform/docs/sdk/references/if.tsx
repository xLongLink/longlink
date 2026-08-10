import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    "name": "if",
    "slug": "if",
    "category": "Runtime",
    "summary": "Conditionally renders an XML node when its expression evaluates to a truthy value.",
    "usage": "Add if to rendered XML nodes and adapter-consumed child nodes that should appear only in one state.",
    "attributesTitle": "Rules",
    "attributes": [
        {
            "name": "if",
            "description": "Expression evaluated against the current XML runtime scope.",
            "required": true
        },
        {
            "name": "scope",
            "description": "Can read State, Query, params, and loop aliases available at the node position."
        },
        {
            "name": "result",
            "description": "Falsy results skip the node and its children; truthy results render normally."
        }
    ],
    "example": "<Badge if=\"${order.blocked}\" variant=\"error\" i18n=\"orders.blocked\" />\n\n<Selector label=\"Status\" value=\"$filters.status\">\n  <SelectorOption value=\"open\" label=\"Open\" />\n  <SelectorOption if=\"${user.canClose}\" value=\"closed\" label=\"Closed\" />\n</Selector>"
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/if.tsx',
};
