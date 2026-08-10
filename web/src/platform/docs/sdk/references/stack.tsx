import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    "name": "Stack",
    "slug": "stack",
    "category": "Layout",
    "summary": "Arranges children vertically or horizontally.",
    "usage": "Use Stack as the default layout primitive for spacing groups of elements.",
    "attributes": [
        {
            "name": "direction",
            "description": "vertical or horizontal."
        },
        {
            "name": "gap",
            "description": "Astryx spacing value."
        },
        {
            "name": "justify",
            "description": "start, center, end, between, around, or evenly."
        },
        {
            "name": "align",
            "description": "start, center, end, or stretch."
        },
        {
            "name": "wrap",
            "description": "Allows horizontal children to wrap."
        }
    ],
    "children": "Any rendered XML content.",
    "example": "<Stack direction=\"horizontal\" justify=\"between\" align=\"center\" gap=\"3\">\n  <Text value=\"$order.number\" />\n  <Button label=\"Open\" />\n</Stack>"
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/stack.tsx',
};
