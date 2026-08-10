import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    "name": "Dynamic Pages",
    "slug": "dynamic-pages",
    "category": "Runtime",
    "summary": "Maps bracketed XML page filenames to browser route parameters.",
    "usage": "Use dynamic pages when one XML definition should render many records by route id.",
    "attributesTitle": "Rules",
    "attributes": [
        {
            "name": "[name].xml",
            "description": "Declares one dynamic path segment."
        },
        {
            "name": "params",
            "description": "Matched route parameters are exposed to XML expressions under params."
        },
        {
            "name": "navigation",
            "description": "Dynamic pages inherit their tab from the first static route segment."
        }
    ],
    "example": "src/pages/issues/[issue].xml -> /issues/:issue\n\n<Query id=\"issue\" path=\"/api/issues/${params.issue}\" />\n<Heading level=\"1\" value=\"$issue.title\" />"
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/dynamic-pages.tsx',
};
