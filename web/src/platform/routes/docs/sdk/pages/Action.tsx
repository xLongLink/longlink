import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { proportional, Table } from '@astryxdesign/core/Table';

export const metadata = {
    path: '/docs/sdk/pages/action',
    title: 'Action',
    description:
        'Use Action to run requests and state changes in order when someone presses its one terminal Button or Link. A control with to navigates and ends the action.',
    toc: [
        { id: 'introduction', label: 'Introduction', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/pages/Action.tsx',
};

export default function DocsArticleRoute() {
    return (
        <Article page={metadata}>
            <Stack gap={5}>
                <Stack gap={2}>
                    <Text type="supporting">{'State'}</Text>
                    <Heading id="introduction" level={1}>
                        {'Action'}
                    </Heading>
                </Stack>
                <Text as="p">
                    {
                        'Use Action to run requests and state changes in order when someone presses its one terminal Button or Link. A control with to navigates and ends the action.'
                    }
                </Text>
                <Table
                    data={[['if', 'Conditionally renders the action.']].map(([parameter, description]) => ({
                        parameter,
                        description,
                    }))}
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
                    code={
                        '<Action>\n  <Request url="/api/orders/${order.id}/complete" method="PATCH" />\n  <Patch state="orders" invalidate="true" />\n  <Button label="Complete and view order" to="/orders/${order.id}" />\n</Action>'
                    }
                    language="xml"
                />
            </Stack>
        </Article>
    );
}
