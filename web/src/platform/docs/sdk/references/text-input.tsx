import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    name: 'TextInput',
    slug: 'text-input',
    category: 'Form',
    summary: 'Collects short text values.',
    usage: 'Use TextInput for names, identifiers, emails, search terms, and other single-line values.',
    attributes: [
        {
            name: 'label or i18n',
            description: 'Accessible field label.',
            required: true,
        },
        {
            name: 'value',
            description: 'String value or writable state binding.',
            required: true,
        },
        {
            name: 'type',
            description: 'text, password, or email.',
        },
        {
            name: 'placeholder',
            description: 'Placeholder text.',
        },
        {
            name: 'hasClear',
            description: 'Shows a clear action when the value is non-empty.',
        },
    ],
    example: '<TextInput label="Customer name" value="$form.name" isRequired="true" />',
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/text-input.tsx',
};
