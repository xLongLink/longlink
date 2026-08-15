import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { publicSeoMeta } from '@/lib/seo';
import { Article } from '@/components/layouts/Article';

function Content() {
    return (
        <Stack gap={5}>
            <Stack gap={2}>
                <Text type="supporting">{'Action'}</Text>
                <Heading id="introduction" level={1}>
                    {'Button'}
                </Heading>
            </Stack>
            <Text as="p">{'Renders a labeled command, submit trigger, or action trigger.'}</Text>
            <Heading id="usage" level={2}>
                Usage
            </Heading>
            <CodeBlock
                code={
                    '<Action action="/api/orders" invalidate="orders">\n  <Button label="Save" variant="primary" />\n</Action>'
                }
                language="xml"
            />
        </Stack>
    );
}

export const metadata = {
    path: '/docs/sdk/pages/button',
    title: 'Button',
    description: 'Renders a labeled command, submit trigger, or action trigger.',
    toc: [
        { id: 'introduction', label: 'Introduction', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/pages/Button.tsx',
};

export const meta = () => publicSeoMeta(metadata);

export default function DocsArticleRoute() {
    return (
            <Article
                page={{
                    ...metadata,
                    content: <Content />,
                    metadata,
                }}
            />
    );
}
