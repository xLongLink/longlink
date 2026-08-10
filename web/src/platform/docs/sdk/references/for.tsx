import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    name: 'For',
    slug: 'for',
    category: 'State',
    summary: 'Repeats child XML for every item in an array.',
    usage: 'Use For when query results or state arrays should render repeated rows, cards, or controls.',
    attributes: [
        {
            name: 'each',
            description: 'Expression that resolves to an array.',
            required: true,
        },
        {
            name: 'as',
            description: 'Local item variable name for each iteration.',
            required: true,
        },
    ],
    children: 'Any rendered XML elements. Each iteration gets the item alias and index value.',
    example: '<For each="$orders.items" as="order">\n  <Card>\n    <Text value="$order.number" />\n  </Card>\n</For>',
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/for.tsx',
};
