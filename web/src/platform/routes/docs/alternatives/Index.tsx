import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { DocumentationArticle } from '@/components/layouts/Article';

const article = {
    title: 'Alternatives | LongLink',
    description: 'Compare LongLink with other platforms for internal tools and workflow automation.',
    toc: [{ id: 'alternatives', label: 'Alternatives', level: 1 }],
    lastUpdated: '2026-10-29',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/alternatives/Index.tsx',
};

/** Introduces comparisons with other internal-tool and automation platforms. */
export default function Alternatives() {
    return (
        <DocumentationArticle article={article}>
            <Stack gap={5}>
                <Heading id="alternatives" level={1}>
                    Alternatives
                </Heading>
                <Text as="p">
                    Compare LongLink with other tools for building internal applications and automating business
                    processes. These guides focus on architecture, developer workflows, and practical trade-offs.
                </Text>
                <Text as="p">
                    <Link href="/docs/alternatives/windmill/" hasUnderline type="inherit">
                        LongLink vs Windmill
                    </Link>{' '}
                    — compare Python business applications with a multi-language workflow and app platform.
                </Text>
            </Stack>
        </DocumentationArticle>
    );
}
