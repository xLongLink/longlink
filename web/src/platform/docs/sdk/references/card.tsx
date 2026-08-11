import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    name: 'Card',
    slug: 'card',
    category: 'Layout',
    summary: 'Groups one discrete item on an Astryx surface.',
    usage: 'Use Card for self-contained content that can be compared, reordered, or removed independently.',
    attributes: [
        {
            name: 'variant',
            description: 'default, transparent, muted, or named color surface.',
        },
        {
            name: 'padding',
            description: 'Astryx spacing value.',
        },
        {
            name: 'width, height, maxWidth, minHeight',
            description: 'Optional size constraints.',
        },
    ],
    children: 'Any rendered XML content.',
    example:
        '<Card variant="muted">\n  <Stack gap="2">\n    <Heading level="3" label="Order" />\n    <Text value="$order.number" />\n  </Stack>\n</Card>',
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/card.tsx',
};
