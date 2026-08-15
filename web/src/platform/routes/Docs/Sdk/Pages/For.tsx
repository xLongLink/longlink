import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { publicSeoMeta } from '@/lib/seo';
import { Article } from '@/components/layouts/Article';
import { Documentation } from '@/platform/layouts/Documentation';

function Content() {
    return (
        <Stack gap={5}>
            <Stack gap={2}>
                <Text type="supporting">{'State'}</Text>
                <Heading id="introduction" level={1}>
                    {'For'}
                </Heading>
            </Stack>
            <Text as="p">{'Repeats child XML for every item in an array.'}</Text>
            <Heading id="usage" level={2}>
                Usage
            </Heading>
            <CodeBlock
                code={
                    '<For each="$orders.items" as="order">\n  <Card>\n    <Text value="$order.number" />\n  </Card>\n</For>'
                }
                language="xml"
            />
        </Stack>
    );
}

export const metadata = {
    path: '/docs/sdk/pages/for',
    title: 'For',
    description: 'Repeats child XML for every item in an array.',
    toc: [
        { id: 'introduction', label: 'Introduction', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/Docs/Sdk/Pages/For.tsx',
};

export const meta = () => publicSeoMeta(metadata);

export default function DocsArticleRoute() {
    return (
        <Documentation>
            <Article
                page={{
                    ...metadata,
                    breadcrumbs: [
                        { title: 'Documentation', path: '/docs' },
                        { title: 'Applications', path: '/docs/sdk' },
                        { title: 'Pages', path: '/docs/sdk/pages' },
                        { title: metadata.title, path: metadata.path },
                    ],
                    content: <Content />,
                    metadata,
                }}
            />
        </Documentation>
    );
}
