import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    name: 'Switch',
    slug: 'switch',
    category: 'Form',
    summary: 'Captures an immediate on/off setting.',
    usage: 'Use Switch for preferences that take effect as soon as they change.',
    attributes: [
        {
            name: 'label or i18n',
            description: 'Accessible setting label.',
            required: true,
        },
        {
            name: 'value',
            description: 'Boolean value or writable state binding.',
            required: true,
        },
        {
            name: 'labelPosition',
            description: 'start or end.',
        },
        {
            name: 'labelSpacing',
            description: 'hug or spread.',
        },
        {
            name: 'isDisabled',
            description: 'Disables the switch.',
        },
    ],
    example: '<Switch label="Notifications" value="$settings.notifications" />',
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/switch.tsx',
};
