import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    name: 'Banner',
    slug: 'banner',
    category: 'Content',
    summary: 'Shows persistent page-level feedback.',
    usage: 'Use Banner for important information, warnings, errors, or success states that need space.',
    attributes: [
        {
            name: 'title or i18n',
            description: 'Banner title.',
            required: true,
        },
        {
            name: 'status',
            description: 'info, warning, error, or success.',
        },
    ],
    children: 'Optional detail content.',
    example:
        '<Banner status="warning" title="Review required">\n  <Text value="This order needs approval before completion." />\n</Banner>',
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/banner.tsx',
};
