import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';

export const metadata = {
    path: '/docs/sdk/pages/grid',
    title: 'Grid',
    description:
        'A CSS grid layout container for arranging children in rows and columns. Use Grid for card galleries, dashboards, and any multi-column layout. Supports fixed column counts and responsive columns that reflow based on available width.',
    toc: [
        { id: 'introduction', label: 'Introduction', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/pages/Grid.tsx',
};

export default function DocsArticleRoute() {
    return (
        <Article page={metadata}>
            <Stack gap={5}>
                <Stack gap={2}>
                    <Text type="supporting">{'Layout'}</Text>
                    <Heading id="introduction" level={1}>
                        {'Grid'}
                    </Heading>
                </Stack>
                <Text as="p">{metadata.description}</Text>
                <Heading id="usage" level={2}>
                    Usage
                </Heading>
                <CodeBlock
                    code={
                        '<Grid minColumnWidth="240" maxColumns="3" repeat="fit">\n  <Card>First</Card>\n  <Card>Second</Card>\n</Grid>'
                    }
                    language="xml"
                />
            </Stack>
        </Article>
    );
}
