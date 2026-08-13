import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';

export const content = (
    <Stack gap={5}>
        <Stack gap={2}>
            <Text type="supporting">{'Form'}</Text>
            <Heading id="introduction" level={1}>
                {'RadioListItem'}
            </Heading>
        </Stack>
        <Text as="p">{'Defines one option inside a RadioList.'}</Text>
        <Heading id="usage" level={2}>
            Usage
        </Heading>
        <CodeBlock code={'<RadioListItem value="team" label="Team" description="Shared workspace" />'} language="xml" />
    </Stack>
);

export const metadata = {
    toc: [
        { id: 'introduction', label: 'Introduction', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/pages/radio-list-item.tsx',
};
