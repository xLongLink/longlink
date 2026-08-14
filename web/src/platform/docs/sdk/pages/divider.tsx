import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';

export default function DividerDocumentation() {
    return (
        <Stack gap={5}>
            <Stack gap={2}>
                <Text type="supporting">{'Layout'}</Text>
                <Heading id="introduction" level={1}>
                    {'Divider'}
                </Heading>
            </Stack>
            <Text as="p">{'Separates related regions with a rule.'}</Text>
            <Heading id="usage" level={2}>
                Usage
            </Heading>
            <CodeBlock code={'<Divider label="Or" variant="strong" />'} language="xml" />
        </Stack>
    );
}

export const metadata = {
    path: '/docs/sdk/pages/divider',
    title: 'Divider',
    description: 'Separates related regions with a rule.',
    toc: [
        { id: 'introduction', label: 'Introduction', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/pages/divider.tsx',
};
