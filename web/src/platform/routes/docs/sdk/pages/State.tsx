import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';

export const metadata = {
    path: '/docs/sdk/pages/state',
    title: 'State',
    description:
        'Use State for information that changes while someone uses a page, such as form entries or selected options.',
    toc: [
        { id: 'introduction', label: 'Introduction', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/pages/State.tsx',
};

export default function DocsArticleRoute() {
    return (
        <Article page={metadata}>
            <Stack gap={5}>
                <Stack gap={2}>
                    <Text type="supporting">{'State'}</Text>
                    <Heading id="introduction" level={1}>
                        {'State'}
                    </Heading>
                </Stack>
                <Text as="p">
                    {
                        'Use State for information that changes while someone uses a page, such as form entries or selected options.'
                    }
                </Text>
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
