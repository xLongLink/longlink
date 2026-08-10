import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    name: 'longlink',
    slug: 'longlink',
    category: 'State',
    summary: 'Wraps one XML page and declares optional navigation metadata for the LongLink web runtime.',
    usage: 'Use longlink as the root element in every XML page file.',
    attributes: [
        {
            name: 'name',
            description: 'Readable page tab label included in the page manifest.',
        },
        {
            name: 'icon',
            description: 'Lucide icon slug included in the page manifest.',
        },
    ],
    children: 'State, Query, layout elements, component elements, and rendered control flow.',
    example:
        '<longlink name="Orders" icon="clipboard-list">\n  <Heading level="1" i18n="orders.title" />\n  <Text as="p" i18n="orders.description" />\n</longlink>',
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/longlink.tsx',
};
