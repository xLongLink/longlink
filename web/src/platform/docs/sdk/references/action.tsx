import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    name: 'Action',
    slug: 'action',
    category: 'State',
    summary: 'Provides request behavior to child triggers and refreshes selected runtime values.',
    usage: 'Wrap a Button or control that should send an application request when activated.',
    attributes: [
        {
            name: 'action',
            description: 'Application-relative request path.',
        },
        {
            name: 'method',
            description: 'HTTP method. Defaults to POST.',
        },
        {
            name: 'json',
            description: 'Expression payload sent as JSON.',
        },
        {
            name: 'form',
            description: 'Expression object sent as multipart form data.',
        },
        {
            name: 'invalidate',
            description: 'Setup ids to refresh after a successful request.',
        },
    ],
    children: 'Usually contains one Button or ButtonGroup entry.',
    example:
        '<Action action="/api/orders/${order.id}/complete" method="PATCH" invalidate="${[\'orders\']}">\n  <Button label="Complete" />\n</Action>',
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/action.tsx',
};
