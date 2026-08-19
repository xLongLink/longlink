import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';

export const metadata = {
    path: '/docs/sdk/pages/action',
    title: 'Action',
    description: 'Runs ordered requests and runtime state effects from a child trigger.',
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
                <Text as="p">{'Runs ordered requests and runtime state effects from a child trigger.'}</Text>
                <Heading id="usage" level={2}>
                    Usage
                </Heading>
                <CodeBlock
                    code={
                        '<Action>\n  <Request url="/api/orders/${order.id}/complete" method="PATCH" />\n  <Patch state="pager" value="${{ page: pager.page + 1 }}" />\n  <Patch state="orders" invalidate="true" />\n  <Button label="Complete" />\n</Action>'
                    }
                    language="xml"
                />
            </Stack>
        </Article>
    );
}
