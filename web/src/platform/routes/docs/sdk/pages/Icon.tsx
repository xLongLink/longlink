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
                <Text type="supporting">{'Content'}</Text>
                <Heading id="introduction" level={1}>
                    {'Icon'}
                </Heading>
            </Stack>
            <Text as="p">{'Displays a Lucide icon.'}</Text>
            <Heading id="usage" level={2}>
                Usage
            </Heading>
            <CodeBlock code={'<Icon icon="info" size="sm" />'} language="xml" />
        </Stack>
    );
}

export const metadata = {
    path: '/docs/sdk/pages/icon',
    title: 'Icon',
    description: 'Displays a Lucide icon.',
    toc: [
        { id: 'introduction', label: 'Introduction', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/pages/Icon.tsx',
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
