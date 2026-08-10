import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    name: 'CheckboxInput',
    slug: 'checkbox-input',
    category: 'Data Input',
    summary: 'Captures one boolean value.',
    usage: 'Use CheckboxInput for form-submitted boolean choices such as acceptance or inclusion.',
    attributes: [
        {
            name: 'label or i18n',
            description: 'Accessible field label.',
            required: true,
        },
        {
            name: 'value',
            description: 'Boolean value or writable state binding.',
            required: true,
        },
        {
            name: 'isRequired, isOptional, isDisabled',
            description: 'Explicit field states.',
        },
        {
            name: 'status',
            description: 'Validation status.',
        },
    ],
    example: '<CheckboxInput label="Active" value="$form.active" />',
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/checkbox-input.tsx',
};
