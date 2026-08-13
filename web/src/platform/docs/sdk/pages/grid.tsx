import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';

export const content = (
    <Stack gap={5}>
        <Stack gap={2}>
            <Text type="supporting">{'Layout'}</Text>
            <Heading id="introduction" level={1}>
                {'Grid'}
            </Heading>
        </Stack>
        <Text as="p">{'Creates fixed or responsive multi-column layouts.'}</Text>
        <Heading id="usage" level={2}>
            Usage
        </Heading>
        <CodeBlock
            code={
                '<Grid minColumnWidth="240" maxColumns="3" repeat="fit" gap="4">\n  <Card><Text value="First" /></Card>\n  <Card><Text value="Second" /></Card>\n</Grid>'
            }
            language="xml"
        />
    </Stack>
);

export const metadata = {
    toc: [
        { id: 'introduction', label: 'Introduction', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/pages/grid.tsx',
};
