import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';

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

export default function DocsArticleRoute() {
    return (
        <Article page={metadata}>
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
                        '<TextInput label="Name" value="$form.name" />\n<Button label="Save" />\n<Link to="/orders/${params.order}" label="Open order" />'
                    }
                    language="xml"
                />
            </Stack>
        </Article>
    );
}
