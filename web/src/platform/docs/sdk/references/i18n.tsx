import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    name: 'i18n',
    slug: 'i18n',
    category: 'Runtime',
    summary: 'Looks up visible copy from the active XML translation catalog.',
    usage: 'Use i18n on text-bearing elements instead of hardcoding visible copy in page XML.',
    attributesTitle: 'Rules',
    attributes: [
        {
            name: 'i18n',
            description: 'Literal dotted translation key such as orders.title. It is not an expression.',
            required: true,
        },
        {
            name: 'values',
            description: 'Optional expression object for ICU message interpolation.',
        },
        {
            name: 'count',
            description: 'Optional numeric expression supplied to ICU plural messages.',
        },
    ],
    example:
        '<Heading level="1" i18n="orders.title" />\n<Text as="p" i18n="orders.summary" values="${{ customer: order.customer }}" />',
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/i18n.tsx',
};
