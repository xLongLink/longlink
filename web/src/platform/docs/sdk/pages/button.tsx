import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';

export const content = (
    <Stack gap={5}>
        <Stack gap={2}>
            <Text type="supporting">{'Action'}</Text>
            <Heading id="introduction" level={1}>{'Button'}</Heading>
        </Stack>
        <Text as="p">{'Renders a labeled command, submit trigger, or action trigger.'}</Text>
        <Heading id="usage" level={2}>
            Usage
        </Heading>
        <CodeBlock
            code={
                    '<Action action="/api/orders" invalidate="orders">\n  <Button label="Save" variant="primary" />\n</Action>'}
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
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/pages/button.tsx',
};
