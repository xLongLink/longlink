import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';

export const metadata = {
    path: '/docs/sdk/pages/avatar',
    title: 'Avatar',
    description:
        'Avatar represents a person or team with a profile photo, initials, or a default icon. Use it in comment headers, contact lists, chat messages, user cards, and anywhere you need to identify someone visually.',
    toc: [
        { id: 'introduction', label: 'Introduction', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/pages/Avatar.tsx',
};

export default function DocsArticleRoute() {
    return (
        <Article page={metadata}>
            <Stack gap={5}>
                <Stack gap={2}>
                    <Text type="supporting">{'Content'}</Text>
                    <Heading id="introduction" level={1}>
                        {'Avatar'}
                    </Heading>
                </Stack>
                <Text as="p">{metadata.description}</Text>
                <Heading id="usage" level={2}>
                    Usage
                </Heading>
                <CodeBlock
                    code={'<Avatar src="$user.avatarUrl" name="$user.name" alt="$user.name" />'}
                    language="xml"
                />
            </Stack>
        </Article>
    );
}
