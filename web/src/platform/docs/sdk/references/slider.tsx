import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    name: 'Slider',
    slug: 'slider',
    category: 'Data Input',
    summary: 'Captures bounded numeric values through a range control.',
    usage: 'Use Slider for approximate values where visual adjustment is faster than typing.',
    attributes: [
        {
            name: 'label or i18n',
            description: 'Accessible field label.',
            required: true,
        },
        {
            name: 'value',
            description: 'Numeric value or writable state binding.',
            required: true,
        },
        {
            name: 'min, max, step',
            description: 'Numeric range constraints.',
        },
        {
            name: 'valueDisplay',
            description: 'tooltip, text, or none.',
        },
        {
            name: 'orientation',
            description: 'horizontal or vertical.',
        },
    ],
    example: '<Slider label="Budget" value="$form.budget" min="500" max="10000" step="500" />',
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/slider.tsx',
};
