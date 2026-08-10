import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    name: 'Dialog',
    slug: 'dialog',
    category: 'Overlay',
    summary: 'Renders a modal workflow from one flat owner element.',
    usage: 'Use Dialog for focused flows that should sit above the current page.',
    attributes: [
        {
            name: 'title or i18n',
            description: 'Dialog title.',
            required: true,
        },
        {
            name: 'isOpen',
            description: 'Boolean value or writable state binding.',
        },
        {
            name: 'purpose',
            description: 'info, form, confirmation, or required.',
        },
        {
            name: 'width',
            description: 'Dialog width.',
        },
    ],
    children: 'Dialog body content.',
    example:
        '<Dialog title="Edit order" isOpen="$dialog.open">\n  <FormLayout>\n    <TextInput label="Name" value="$form.name" />\n  </FormLayout>\n</Dialog>',
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/dialog.tsx',
};
