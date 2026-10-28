import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Blockquote } from '@astryxdesign/core/Blockquote';
import { DocumentationArticle } from '@/components/layouts/Article';

const article = {
    title: 'MCP | LongLink Platform Documentation',
    description: 'Connect to the LongLink Platform with the Model Context Protocol.',
    toc: [{ id: 'mcp', label: 'MCP', level: 1 }],
    lastUpdated: '2026-10-18',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/api/Mcp.tsx',
};

/** Renders the MCP documentation page while its content is being built. */
export default function Mcp() {
    return (
        <DocumentationArticle article={article}>
            <Stack gap={5}>
                <Heading id="mcp" level={1}>
                    MCP
                </Heading>
                <Blockquote className="border-s-(--color-text-orange) text-(--color-text-orange)">
                    <Stack gap={0}>
                        <Text type="inherit">Beta notice: This page is being built.</Text>
                        <Link color="inherit" href={article.editUrl} hasUnderline isExternalLink type="inherit">
                            Edit on GitHub
                        </Link>
                    </Stack>
                </Blockquote>
            </Stack>
        </DocumentationArticle>
    );
}
