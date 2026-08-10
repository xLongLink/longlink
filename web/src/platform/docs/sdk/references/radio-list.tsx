import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    name: 'RadioList',
    slug: 'radio-list',
    category: 'Data Input',
    summary: 'Presents one visible single-choice option group.',
    usage: 'Use RadioList when users need to compare a small set of mutually exclusive options.',
    attributes: [
        {
            name: 'label or i18n',
            description: 'Accessible group label.',
            required: true,
        },
        {
            name: 'value',
            description: 'Selected value or writable state binding.',
            required: true,
        },
        {
            name: 'orientation',
            description: 'vertical or horizontal.',
        },
        {
            name: 'size',
            description: 'sm or md.',
        },
    ],
    children: 'RadioListItem children.',
    example:
        '<RadioList label="Plan" value="$form.plan" orientation="horizontal">\n  <RadioListItem value="solo" label="Solo" />\n  <RadioListItem value="team" label="Team" />\n</RadioList>',
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/radio-list.tsx',
};
