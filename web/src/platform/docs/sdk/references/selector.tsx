import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    name: 'Selector',
    slug: 'selector',
    category: 'Data Input',
    summary: 'Presents a dropdown selection control.',
    usage: 'Use Selector when a moderate set of options should stay compact until opened.',
    attributes: [
        {
            name: 'label or i18n',
            description: 'Accessible field label.',
            required: true,
        },
        {
            name: 'value',
            description: 'Selected value or writable state binding.',
        },
        {
            name: 'hasClear',
            description: 'Allows clearing the selected value.',
        },
        {
            name: 'hasSearch',
            description: 'Adds option search.',
        },
        {
            name: 'placeholder',
            description: 'Placeholder shown without a selected value.',
        },
    ],
    children: 'SelectorOption children.',
    example:
        '<Selector label="Status" value="$filters.status" hasClear="true">\n  <SelectorOption value="open" label="Open" />\n  <SelectorOption value="closed" label="Closed" />\n</Selector>',
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/selector.tsx',
};
