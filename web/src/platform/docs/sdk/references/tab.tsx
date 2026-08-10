import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    name: 'Tab',
    slug: 'tab',
    category: 'Navigation',
    summary: 'Defines one tab destination inside a TabList.',
    usage: 'Use Tab only as a child of TabList.',
    attributes: [
        {
            name: 'value',
            description: 'Tab value or destination.',
            required: true,
        },
        {
            name: 'label or i18n',
            description: 'Visible tab label.',
            required: true,
        },
        {
            name: 'icon',
            description: 'Optional icon name.',
        },
        {
            name: 'href',
            description: 'Optional route destination.',
        },
    ],
    example: '<Tab value="overview" label="Overview" />',
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/tab.tsx',
};
