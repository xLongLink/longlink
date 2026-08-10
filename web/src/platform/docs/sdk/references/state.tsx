import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    name: 'State',
    slug: 'state',
    category: 'State',
    summary: 'Declares local reactive page state before the page renders.',
    usage: 'Use State near the top of the page when controls need writable local values.',
    attributes: [
        {
            name: 'id',
            description: 'Literal state name exposed in XML expressions.',
            required: true,
        },
        {
            name: 'additional attributes',
            description: 'Initial state fields. JSON values are parsed first, otherwise the value is evaluated.',
        },
    ],
    children: 'State is setup-only and cannot have children.',
    example: '<State id="form" name="" active="true" />\n\n<TextInput label="Name" value="$form.name" />',
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/state.tsx',
};
