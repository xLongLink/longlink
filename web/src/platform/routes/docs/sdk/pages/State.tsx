import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { publicSeoMeta } from '@/lib/seo';
import { Article } from '@/components/layouts/Article';

export const metadata = {
    path: '/docs/sdk/pages/state',
    title: 'State',
    description: 'Declares local reactive page state before the page renders.',
    toc: [
        { id: 'introduction', label: 'Introduction', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/pages/State.tsx',
};

export const meta = () => publicSeoMeta(metadata);

export default function DocsArticleRoute() {
    return (
        <Article page={{ ...metadata, metadata }}>
            <Stack gap={5}>
                <Stack gap={2}>
                    <Text type="supporting">{'State'}</Text>
                    <Heading id="introduction" level={1}>
                        {'State'}
                    </Heading>
                </Stack>
                <Text as="p">{'Declares local reactive page state before the page renders.'}</Text>
                <Heading id="usage" level={2}>
                    Usage
                </Heading>
                <CodeBlock
                    code={'<State id="form" name="" active="true" />\n\n<TextInput label="Name" value="$form.name" />'}
                    language="xml"
                />
            </Stack>
        </Article>
    );
}
