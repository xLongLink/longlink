import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { publicSeoMeta } from '@/lib/seo';
import { Article } from '@/components/layouts/Article';

export const metadata = {
    path: '/docs/sdk/pages/side-nav',
    title: 'SideNav',
    description: 'Renders application navigation in a sidebar container.',
    toc: [
        { id: 'introduction', label: 'Introduction', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/pages/SideNav.tsx',
};

export const meta = () => publicSeoMeta(metadata);

export default function DocsArticleRoute() {
    return (
        <Article page={metadata}>
            <Stack gap={5}>
                <Stack gap={2}>
                    <Text type="supporting">{'Layout'}</Text>
                    <Heading id="introduction" level={1}>
                        {'SideNav'}
                    </Heading>
                </Stack>
                <Text as="p">{'Renders application navigation in a sidebar container.'}</Text>
                <Heading id="usage" level={2}>
                    Usage
                </Heading>
                <CodeBlock
                    code={
                        '<SideNav label="Application navigation">\n  <SideNavItem value="/orders" label="Orders" />\n  <SideNavItem value="/customers" label="Customers" />\n</SideNav>'
                    }
                    language="xml"
                />
            </Stack>
        </Article>
    );
}
