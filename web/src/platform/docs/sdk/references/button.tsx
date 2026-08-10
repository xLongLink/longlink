import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    name: 'Button',
    slug: 'button',
    category: 'Action',
    summary: 'Renders a labeled command, submit trigger, or action trigger.',
    usage: 'Use Button for commands. Use Link for navigation.',
    attributes: [
        {
            name: 'label or i18n',
            description: 'Accessible button text.',
            required: true,
        },
        {
            name: 'variant',
            description: 'primary, secondary, ghost, or destructive.',
        },
        {
            name: 'size',
            description: 'sm, md, or lg.',
        },
        {
            name: 'type',
            description: 'button, submit, or reset.',
        },
        {
            name: 'isDisabled',
            description: 'Disables the button.',
        },
        {
            name: 'isLoading',
            description: 'Shows a loading state.',
        },
    ],
    children: 'Optional child content can override visible content while the label remains the accessible name.',
    example:
        '<Action action="/api/orders" invalidate="orders">\n  <Button label="Save" variant="primary" />\n</Action>',
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/button.tsx',
};
