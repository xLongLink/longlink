import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { publicSeoMeta } from '@/lib/seo';
import { Article } from '@/components/layouts/Article';

export const metadata = {
    path: '/docs/sdk/pages/bindings',
    title: 'Bindings',
    description: 'Connects writable control values to State objects declared in the XML runtime.',
    toc: [
        { id: 'introduction', label: 'Introduction', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/pages/Bindings.tsx',
};

export const meta = () => publicSeoMeta(metadata);

export default function DocsArticleRoute() {
    return (
        <Article page={metadata}>
            <Stack gap={5}>
                <Stack gap={2}>
                    <Text type="supporting">{'Runtime'}</Text>
                    <Heading id="introduction" level={1}>
                        {'Bindings'}
                    </Heading>
                </Stack>
                <Text as="p">{'Connects writable control values to State objects declared in the XML runtime.'}</Text>
                <Heading id="usage" level={2}>
                    Usage
                </Heading>
                <CodeBlock
                    code={
                        '<State id="form" name="" active="true" />\n\n<TextInput label="Name" value="$form.name" />\n<Switch label="Active" value="$form.active" />'
                    }
                    language="xml"
                />
            </Stack>
        </Article>
    );
}
