import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';

const metadata = {
    seo: {
        title: 'Expressions | LongLink Documentation',
        description: 'Use expressions in LongLink XML views to render dynamic application interfaces.',
    },
    toc: [
        { id: 'introduction', label: 'Introduction', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/views/Expressions.tsx',
};

export default function DocsArticleRoute() {
    return (
        <Article page={metadata}>
            <Stack gap={5}>
                <Heading id="introduction" level={1}>
                    Expressions
                </Heading>
                <Text as="p">Evaluates a safe JavaScript expression subset against the XML runtime scope.</Text>
                <Heading id="usage" level={2}>
                    Usage
                </Heading>
                <CodeBlock
                    code={
                        '<TextInput label="Name" value="$form.name" />\n<Button>Save</Button>\n<Link to="/orders/${params.order}">Open order</Link>'
                    }
                    language="xml"
                />
            </Stack>
        </Article>
    );
}
