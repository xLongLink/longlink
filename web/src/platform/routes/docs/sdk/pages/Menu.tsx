import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';

export const metadata = {
    path: '/docs/sdk/pages/menu',
    title: 'Menu',
    description: 'Renders hash-selected application sections in the shared menu layout.',
    toc: [
        { id: 'introduction', label: 'Introduction', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-08-19',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/pages/Menu.tsx',
};

/** Documents the XML application menu. */
export default function DocsArticleRoute() {
    return (
        <Article page={metadata}>
            <Stack gap={5}>
                <Stack gap={2}>
                    <Text type="supporting">{'Layout'}</Text>
                    <Heading id="introduction" level={1}>
                        {'Menu'}
                    </Heading>
                </Stack>
                <Text as="p">{'Renders hash-selected application sections in the shared menu layout.'}</Text>
                <Heading id="usage" level={2}>
                    Usage
                </Heading>
                <CodeBlock
                    code={
                        '<Menu>\n  <MenuSection title="Settings">\n    <MenuItem label="General" icon="viewColumns">\n      <Heading id="general" level="2">General</Heading>\n    </MenuItem>\n    <MenuItem label="Workflow" icon="arrowsUpDown">\n      <Heading id="workflow" level="2">Workflow</Heading>\n    </MenuItem>\n  </MenuSection>\n</Menu>'
                    }
                    language="xml"
                />
            </Stack>
        </Article>
    );
}
