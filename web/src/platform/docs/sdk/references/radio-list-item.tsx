import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    name: 'RadioListItem',
    slug: 'radio-list-item',
    category: 'Data Input',
    summary: 'Defines one option inside a RadioList.',
    usage: 'Use RadioListItem only as a direct child of RadioList.',
    attributes: [
        {
            name: 'value',
            description: 'Submitted option value.',
            required: true,
        },
        {
            name: 'label or i18n',
            description: 'Visible option text.',
            required: true,
        },
        {
            name: 'description',
            description: 'Optional supporting text.',
        },
        {
            name: 'isDisabled',
            description: 'Disables this option.',
        },
    ],
    example: '<RadioListItem value="team" label="Team" description="Shared workspace" />',
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/radio-list-item.tsx',
};
