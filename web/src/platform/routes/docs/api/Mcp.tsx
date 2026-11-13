import { NativeStack as Stack } from '@/components/ui/NativeStack';
import { DocumentationArticle } from '@/components/layouts/Article';
import { NativeHeading as Heading } from '@/components/ui/NativeHeading';

const article = {
    title: 'MCP | LongLink Platform Documentation',
    description: 'Connect to the LongLink Platform with the Model Context Protocol.',
    toc: [{ id: 'mcp', label: 'MCP', level: 1 }],
    lastUpdated: '2026-10-18',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/api/Mcp.tsx'
};

/** Renders the MCP documentation page while its content is being built. */
export default function Mcp() {
    return (
        <DocumentationArticle article={article}>
            <Stack gap={5}>
                <Heading id="mcp" level={1}>
                    MCP
                </Heading>
            </Stack>
        </DocumentationArticle>
    );
}
