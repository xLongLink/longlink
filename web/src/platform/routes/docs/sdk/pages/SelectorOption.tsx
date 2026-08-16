import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Article } from '@/components/layouts/Article';

export const metadata = {
    path: '/docs/sdk/pages/selector-option',
    title: 'SelectorOption',
    description: 'Defines one option inside a Selector.',
    toc: [
        { id: 'introduction', label: 'Introduction', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl:
        'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/pages/SelectorOption.tsx',
};

export default function DocsArticleRoute() {
    return (
        <Article page={metadata}>
            <Stack gap={5}>
                <Stack gap={2}>
                    <Text type="supporting">{'Form'}</Text>
                    <Heading id="introduction" level={1}>
                        {'SelectorOption'}
                    </Heading>
                </Stack>
                <Text as="p">{'Defines one option inside a Selector.'}</Text>
                <Heading id="usage" level={2}>
                    Usage
                </Heading>
                <CodeBlock code={'<SelectorOption value="open" label="Open" />'} language="xml" />
            </Stack>
        </Article>
    );
}
