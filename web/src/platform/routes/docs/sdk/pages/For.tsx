import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { proportional, Table } from '@astryxdesign/core/Table';

export const metadata = {
    path: '/docs/sdk/pages/for',
    title: 'For',
    description: 'Use For to turn a collection, such as a list of orders, into repeated content on a page.',
    toc: [
        { id: 'introduction', label: 'Introduction', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/pages/For.tsx',
};

export default function DocsArticleRoute() {
    return (
        <Article page={metadata}>
            <Stack gap={5}>
                <Stack gap={2}>
                    <Text type="supporting">{'State'}</Text>
                    <Heading id="introduction" level={1}>
                        {'For'}
                    </Heading>
                </Stack>
                <Text as="p">
                    {'Use For to turn a collection, such as a list of orders, into repeated content on a page.'}
                </Text>
                <Table
                    data={[
                        ['each', 'Array expression to iterate.'],
                        ['as', 'Name for each array item.'],
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
                <CodeBlock
                    code={'<For each="$orders.items" as="order">\n  <Card>\n    $order.number\n  </Card>\n</For>'}
                    language="xml"
                />
            </Stack>
        </Article>
    );
}
