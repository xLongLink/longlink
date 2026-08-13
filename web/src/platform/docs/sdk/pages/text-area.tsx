import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';

export const content = (
    <Stack gap={5}>
        <Stack gap={2}>
            <Text type="supporting">{'Form'}</Text>
            <Heading id="introduction" level={1}>
                {'TextArea'}
            </Heading>
        </Stack>
        <Text as="p">{'Collects longer text values.'}</Text>
        <Heading id="usage" level={2}>
            Usage
        </Heading>
        <CodeBlock code={'<TextArea label="Notes" value="$form.notes" rows="4" />'} language="xml" />
    </Stack>
);

export const metadata = {
    toc: [
        { id: 'introduction', label: 'Introduction', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/pages/text-area.tsx',
};
