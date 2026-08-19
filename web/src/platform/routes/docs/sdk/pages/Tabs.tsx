import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';

export const metadata = {
    path: '/docs/sdk/pages/tabs',
    title: 'Tabs',
    description: 'Displays tab navigation and the active tab content.',
    toc: [
        { id: 'introduction', label: 'Introduction', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-08-19',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/pages/Tabs.tsx',
};

export default function DocsArticleRoute() {
    return (
        <Article page={metadata}>
            <Stack gap={5}>
                <Stack gap={2}>
                    <Text type="supporting">{'Layout'}</Text>
                    <Heading id="introduction" level={1}>
                        {'Tabs'}
                    </Heading>
                </Stack>
                <Text as="p">{metadata.description}</Text>
                <Heading id="usage" level={2}>
                    Usage
                </Heading>
                <CodeBlock
                    code={
                        '<Tabs value="$tabs.value">\n  <Tab value="overview" label="Overview">Overview content</Tab>\n  <Tab value="activity" label="Activity">Activity content</Tab>\n</Tabs>'
                    }
                    language="xml"
                />
            </Stack>
        </Article>
    );
}
