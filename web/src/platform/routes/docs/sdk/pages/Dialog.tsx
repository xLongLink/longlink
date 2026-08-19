import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';

export const metadata = {
    path: '/docs/sdk/pages/dialog',
    title: 'Dialog',
    description: 'Renders a modal workflow from one flat owner element.',
    toc: [
        { id: 'introduction', label: 'Introduction', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/pages/Dialog.tsx',
};

export default function DocsArticleRoute() {
    return (
        <Article page={metadata}>
            <Stack gap={5}>
                <Stack gap={2}>
                    <Text type="supporting">{'Layout'}</Text>
                    <Heading id="introduction" level={1}>
                        {'Dialog'}
                    </Heading>
                </Stack>
                <Text as="p">{'Renders a modal workflow from one flat owner element.'}</Text>
                <Heading id="usage" level={2}>
                    Usage
                </Heading>
                <CodeBlock
                    code={
                        '<Dialog title="Edit order" isOpen="$dialog.open">\n  <TextInput label="Name" value="$form.name" />\n</Dialog>'
                    }
                    language="xml"
                />
            </Stack>
        </Article>
    );
}
