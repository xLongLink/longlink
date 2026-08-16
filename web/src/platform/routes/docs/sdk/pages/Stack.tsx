import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Article } from '@/components/layouts/Article';

export const metadata = {
    path: '/docs/sdk/pages/stack',
    title: 'Stack',
    description: 'Arranges children vertically or horizontally.',
    toc: [
        { id: 'introduction', label: 'Introduction', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/pages/Stack.tsx',
};

export default function DocsArticleRoute() {
    return (
        <Article page={metadata}>
            <Stack gap={5}>
                <Stack gap={2}>
                    <Text type="supporting">{'Layout'}</Text>
                    <Heading id="introduction" level={1}>
                        {'Stack'}
                    </Heading>
                </Stack>
                <Text as="p">{'Arranges children vertically or horizontally.'}</Text>
                <Heading id="usage" level={2}>
                    Usage
                </Heading>
                <CodeBlock
                    code={
                        '<Stack direction="horizontal" justify="between" align="center" gap="3">\n  <Text value="$order.number" />\n  <Button label="Open" />\n</Stack>'
                    }
                    language="xml"
                />
            </Stack>
        </Article>
    );
}
