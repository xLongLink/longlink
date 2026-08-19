import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';

export const metadata = {
    path: '/docs/sdk/pages/stack',
    title: 'Stack',
    description:
        'Stack arranges items in a row or column with consistent spacing. Use StackItem when an individual child needs to fill available space, scroll, or override cross-axis alignment.',
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
                <Text as="p">{metadata.description}</Text>
                <Heading id="usage" level={2}>
                    Usage
                </Heading>
                <CodeBlock
                    code={
                        '<Stack direction="horizontal" gap="2" align="center">\n  <StackItem>$order.number</StackItem>\n  <StackItem size="fill">Order details</StackItem>\n  <StackItem><Button label="Open" /></StackItem>\n</Stack>'
                    }
                    language="xml"
                />
            </Stack>
        </Article>
    );
}
