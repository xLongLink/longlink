import { NativeStack as Stack } from '@/components/custom/native-stack';
import { DocumentationArticle } from '@/platform/layouts/documentation-article';

const article = {
    title: 'MCP | LongLink Platform Documentation',
    description: 'Connect to the LongLink Platform with the Model Context Protocol.',
    toc: [{ id: 'mcp', label: 'MCP', level: 1 }],
    lastUpdated: '2026-10-18',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/api/mcp.tsx'
};

/** Renders the MCP documentation page while its content is being built. */
export default function Mcp() {
    return (
        <DocumentationArticle article={article}>
            <Stack gap={5}>
                <h1 className="font-semibold tracking-tight text-4xl" id="mcp">
                    MCP
                </h1>
            </Stack>
        </DocumentationArticle>
    );
}
