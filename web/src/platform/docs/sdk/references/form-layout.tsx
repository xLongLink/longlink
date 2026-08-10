import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    name: 'FormLayout',
    slug: 'form-layout',
    category: 'Layout',
    summary: 'Arranges controls with consistent form spacing.',
    usage: 'Use FormLayout around controls that own their labels and validation state.',
    attributes: [
        {
            name: 'direction',
            description: 'vertical, horizontal, or horizontal-labels.',
        },
    ],
    children: 'Form controls such as TextInput, TextArea, NumberInput, Selector, CheckboxInput, Switch, and Slider.',
    example:
        '<FormLayout direction="vertical">\n  <TextInput label="Title" value="$form.title" />\n  <TextArea label="Notes" value="$form.notes" />\n</FormLayout>',
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/form-layout.tsx',
};
