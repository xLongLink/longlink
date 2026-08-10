import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    name: 'values',
    slug: 'values',
    category: 'Runtime',
    summary: 'Supplies interpolation values for an ICU message resolved through i18n.',
    usage: 'Use values when a translated message needs runtime data such as names, counts, or status labels.',
    attributesTitle: 'Rules',
    attributes: [
        {
            name: 'values',
            description: 'Expression that must evaluate to one object.',
            required: true,
        },
        {
            name: 'keys',
            description: 'Object keys must match placeholders in the translation message.',
        },
        {
            name: 'invalid values',
            description: 'Arrays, strings, numbers, booleans, null, and undefined are rejected.',
        },
    ],
    example:
        '<Text\n  i18n="orders.assigned"\n  values="${{ assignee: order.assignee.name, number: order.number }}"\n/>',
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/values.tsx',
};
