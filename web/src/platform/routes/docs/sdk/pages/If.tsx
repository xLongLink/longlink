import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';

export const metadata = {
    path: '/docs/sdk/pages/if',
    title: 'if',
    description: 'Conditionally renders an XML node when its expression evaluates to a truthy value.',
    toc: [
        { id: 'introduction', label: 'Introduction', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/pages/If.tsx',
};

export default function DocsArticleRoute() {
    return (
        <Article page={metadata}>
            <Stack gap={5}>
                <Stack gap={2}>
                    <Text type="supporting">{'Runtime'}</Text>
                    <Heading id="introduction" level={1}>
                        {'if'}
                    </Heading>
                </Stack>
                <Text as="p">
                    {'Conditionally renders an XML node when its expression evaluates to a truthy value.'}
                </Text>
                <Heading id="usage" level={2}>
                    Usage
                </Heading>
                <CodeBlock
                    code={
                        '<Badge if="${order.blocked}">\n  <Text value="Blocked" />\n</Badge>\n\n<Selector label="Status" value="$filters.status">\n  <SelectorOption value="open" label="Open" />\n  <SelectorOption if="${user.canClose}" value="closed" label="Closed" />\n</Selector>'
                    }
                    language="xml"
                />
            </Stack>
        </Article>
    );
}
