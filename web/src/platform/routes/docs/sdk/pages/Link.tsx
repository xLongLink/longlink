import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Article } from '@/components/layouts/Article';

export const metadata = {
    path: '/docs/sdk/pages/link',
    title: 'Link',
    description: 'Navigates inside a LongLink Application or opens an external URL.',
    toc: [
        { id: 'introduction', label: 'Introduction', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/pages/Link.tsx',
};

export default function DocsArticleRoute() {
    return (
        <Article page={metadata}>
            <Stack gap={5}>
                <Stack gap={2}>
                    <Text type="supporting">{'Action'}</Text>
                    <Heading id="introduction" level={1}>
                        {'Link'}
                    </Heading>
                </Stack>
                <Text as="p">{'Navigates inside a LongLink Application or opens an external URL.'}</Text>
                <Heading id="usage" level={2}>
                    Usage
                </Heading>
                <CodeBlock code={'<Link to="/orders/${order.id}"><Text value="Open order" /></Link>'} language="xml" />
            </Stack>
        </Article>
    );
}
