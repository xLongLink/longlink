import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { proportional, Table } from '@astryxdesign/core/Table';

export const metadata = {
    path: '/docs/sdk/pages/divider',
    title: 'Divider',
    description:
        'A visual separator that divides content into distinct sections. Use it to create clear boundaries between groups of related content, or to demarcate interactive regions within a layout.',
    toc: [
        { id: 'introduction', label: 'Introduction', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/pages/Divider.tsx',
};

export default function DocsArticleRoute() {
    return (
        <Article page={metadata}>
            <Stack gap={5}>
                <Stack gap={2}>
                    <Text type="supporting">{'Layout'}</Text>
                    <Heading id="introduction" level={1}>
                        {'Divider'}
                    </Heading>
                </Stack>
                <Text as="p">{metadata.description}</Text>
                <Table
                    data={[
                        ['if', 'Conditional rendering expression.'],
                        ['slot', 'Named child slot.'],
                    ].map(([parameter, description]) => ({ parameter, description }))}
                    columns={[
                        { key: 'parameter', header: 'Parameter', width: proportional(1) },
                        { key: 'description', header: 'Description', width: proportional(3) },
                    ]}
                    density="compact"
                    dividers="rows"
                />
                <Heading id="usage" level={2}>
                    Usage
                </Heading>
                <CodeBlock code={'<Divider>Or</Divider>'} language="xml" />
            </Stack>
        </Article>
    );
}
