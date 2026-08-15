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
                <Text type="supporting">{'Runtime'}</Text>
                <Heading id="introduction" level={1}>
                    {'Expressions'}
                </Heading>
            </Stack>
            <Text as="p">{'Evaluates a safe JavaScript expression subset against the XML runtime scope.'}</Text>
            <Heading id="usage" level={2}>
                Usage
            </Heading>
            <CodeBlock
                code={
                    '<TextInput label="Name" value="$form.name" />\n<Button isDisabled="${!form.name || form.saving}" label="Save" />\n<Link to="/orders/${params.order}" label="Open order" />'
                }
                language="xml"
            />
        </Stack>
    );
}

export const metadata = {
    path: '/docs/sdk/pages/expressions',
    title: 'Expressions',
    description: 'Evaluates a safe JavaScript expression subset against the XML runtime scope.',
    toc: [
        { id: 'introduction', label: 'Introduction', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/pages/Expressions.tsx',
};

export const meta = () => publicSeoMeta(metadata);

export default function DocsArticleRoute() {
    return (
        <Documentation>
            <Article
                page={{
                    ...metadata,
                    content: <Content />,
                    metadata,
                }}
            />
        </Documentation>
    );
}
