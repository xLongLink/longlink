import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    name: 'TextArea',
    slug: 'text-area',
    category: 'Form',
    summary: 'Collects longer text values.',
    usage: 'Use TextArea for comments, notes, descriptions, and other multi-line text.',
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
            name: 'rows',
            description: 'Visible text rows.',
        },
        {
            name: 'maxLength',
            description: 'Character counter limit.',
        },
        {
            name: 'status',
            description: 'Validation status.',
        },
    ],
    example: '<TextArea label="Notes" value="$form.notes" rows="4" />',
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/text-area.tsx',
};
