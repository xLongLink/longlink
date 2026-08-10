import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    name: 'Badge',
    slug: 'badge',
    category: 'Feedback & Status',
    summary: 'Displays a compact status or enumerated label.',
    usage: 'Use Badge for short, stable labels such as role, status, or category.',
    attributes: [
        {
            name: 'label or i18n',
            description: 'Badge text.',
            required: true,
        },
        {
            name: 'variant',
            description: 'neutral, info, success, warning, or error.',
        },
    ],
    example: '<Badge label="$order.status" variant="info" />',
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/badge.tsx',
};
