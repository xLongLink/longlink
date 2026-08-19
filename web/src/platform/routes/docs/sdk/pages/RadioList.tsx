import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';

export const metadata = {
    path: '/docs/sdk/pages/radio-list',
    title: 'RadioList',
    description:
        'A group of options where only one can be selected at a time. All options are visible at once, making it easy to compare choices. Use it when users need to pick one option from a small set.',
    toc: [
        { id: 'introduction', label: 'Introduction', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
        { id: 'items', label: 'Items', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/pages/RadioList.tsx',
};

export default function DocsArticleRoute() {
    return (
        <Article page={metadata}>
            <Stack gap={5}>
                <Stack gap={2}>
                    <Text type="supporting">{'Form'}</Text>
                    <Heading id="introduction" level={1}>
                        {'RadioList'}
                    </Heading>
                </Stack>
                <Text as="p">{metadata.description}</Text>
                <Heading id="usage" level={2}>
                    Usage
                </Heading>
                <CodeBlock
                    code={
                        '<RadioList label="Plan" value="$form.plan" orientation="horizontal">\n  <RadioListItem value="solo" label="Solo" />\n  <RadioListItem value="team" label="Team" />\n</RadioList>'
                    }
                    language="xml"
                />
                <Heading id="items" level={2}>
                    Items
                </Heading>
                <Text as="p">{'Define each choice with a RadioListItem child.'}</Text>
                <CodeBlock
                    code={'<RadioListItem value="team" label="Team" description="Shared workspace" />'}
                    language="xml"
                />
            </Stack>
        </Article>
    );
}
