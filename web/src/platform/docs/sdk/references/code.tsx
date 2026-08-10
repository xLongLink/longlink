import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    name: 'Code',
    slug: 'code',
    category: 'Content',
    summary: 'Renders an inline code value.',
    usage: 'Use Code for field names, route snippets, identifiers, and short inline technical values.',
    attributes: [
        {
            name: 'value',
            description: 'Literal or expression value to render.',
        },
        {
            name: 'i18n',
            description: 'Translation key for localized inline code text.',
        },
    ],
    children: 'Optional inline text content.',
    example: '<Text>\n  Status field: <Code value="status" />\n</Text>',
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/code.tsx',
};
