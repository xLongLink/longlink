import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    name: 'Text',
    slug: 'text',
    category: 'Content',
    summary: 'Renders paragraph, label, span, and supporting text content.',
    usage: 'Use Text for readable copy and values that are not headings.',
    attributes: [
        {
            name: 'as',
            description: 'span, p, div, or label.',
        },
        {
            name: 'type',
            description: 'body, large, label, supporting, code, display style, or inherit.',
        },
        {
            name: 'label, value, or i18n',
            description: 'Text content.',
        },
        {
            name: 'values',
            description: 'Translation interpolation values.',
        },
        {
            name: 'count',
            description: 'ICU plural count.',
        },
    ],
    children: 'Optional text content.',
    example: '<Text as="p" i18n="orders.summary" values="${{ number: order.number }}" />',
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/text.tsx',
};
