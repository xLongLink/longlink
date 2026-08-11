import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    name: 'NumberInput',
    slug: 'number-input',
    category: 'Form',
    summary: 'Collects numeric values.',
    usage: 'Use NumberInput for quantities, amounts, percentages, and bounded numeric fields.',
    attributes: [
        {
            name: 'label or i18n',
            description: 'Accessible field label.',
            required: true,
        },
        {
            name: 'value',
            description: 'Number value or writable state binding.',
            required: true,
        },
        {
            name: 'min, max, step',
            description: 'Numeric constraints.',
        },
        {
            name: 'units',
            description: 'Unit text shown with the input.',
        },
        {
            name: 'isIntegerOnly',
            description: 'Restricts input to integers.',
        },
    ],
    example: '<NumberInput label="Quantity" value="$form.quantity" min="1" step="1" units="items" />',
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/number-input.tsx',
};
