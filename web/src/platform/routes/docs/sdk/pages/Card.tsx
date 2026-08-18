import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Article } from '@/components/layouts/Article';

export const metadata = {
    path: '/docs/sdk/pages/card',
    title: 'Card',
    description: 'Groups one discrete item on an Astryx surface.',
    toc: [
        { id: 'introduction', label: 'Introduction', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/pages/Card.tsx',
};

export default function DocsArticleRoute() {
    return (
        <Article page={metadata}>
            <Stack gap={5}>
                <Stack gap={2}>
                    <Text type="supporting">{'Layout'}</Text>
                    <Heading id="introduction" level={1}>
                        {'Card'}
                    </Heading>
                </Stack>
                <Text as="p">{'Groups one discrete item on an Astryx surface.'}</Text>
                <Heading id="usage" level={2}>
                    Usage
                </Heading>
                <CodeBlock
                    code={
                        '<Card>\n  <Stack>\n    <Heading level="3">Order</Heading>\n    <Text value="$order.number" />\n  </Stack>\n</Card>'
                    }
                    language="xml"
                />
            </Stack>
        </Article>
    );
}
