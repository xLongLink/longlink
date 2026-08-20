import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { proportional, Table } from '@astryxdesign/core/Table';

export const metadata = {
    path: '/docs/sdk/pages/link',
    title: 'Link',
    description:
        'A styled anchor for inline and standalone text navigation. Inside Action, it can follow requests and patches as the terminal navigation step.',
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
                <Text as="p">{metadata.description}</Text>
                <Table
                    data={[
                        ['href', 'External or absolute URL.'],
                        ['to', 'Application-relative navigation destination.'],
                        ['isDisabled', 'Disables the link.'],
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
                    code={
                        '<Link to="/orders/${order.id}">Open order</Link>\n\n<Action>\n  <Request method="POST" url="/api/orders" json="${order}" />\n  <Link to="/orders/${order.id}">Create and open order</Link>\n</Action>'
                    }
                    language="xml"
                />
            </Stack>
        </Article>
    );
}
