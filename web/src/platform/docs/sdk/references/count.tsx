import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    name: 'count',
    slug: 'count',
    category: 'Runtime',
    summary: 'Passes a numeric count into an ICU plural translation.',
    usage: 'Use count with i18n messages that contain plural branches.',
    attributesTitle: 'Rules',
    attributes: [
        {
            name: 'count',
            description: 'Expression coerced to a number and exposed to ICU as count.',
            required: true,
        },
        {
            name: 'values.count',
            description: 'The runtime count is merged into values for the translation call.',
        },
        {
            name: 'non-numeric values',
            description: 'Values that cannot become numbers are ignored for plural selection.',
        },
    ],
    example: '<Text i18n="orders.count" count="${orders.items.length}" />',
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/count.tsx',
};
