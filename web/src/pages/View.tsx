import { useMemo } from 'react';
import { fromXml, renderNode, createContext, registry } from '@/xml';
import { getPageContentFromResponse } from '@/sdk/pages';

type ViewProps = {
    metadata: unknown;
    page: string;
    isLoading?: boolean;
    error?: Error | null;
    emptyMessage: string;
    unexpectedMessage: string;
};

/**
 * Renders XML page content from a metadata response.
 */
export default function View({ metadata, page, isLoading, error, emptyMessage, unexpectedMessage }: ViewProps) {
    const pageContent = useMemo(() => getPageContentFromResponse(metadata, page), [metadata, page]);

    if (error) {
        return <div>{error.message}</div>;
    }

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (!pageContent) {
        return <div>{unexpectedMessage ?? emptyMessage}</div>;
    }

    const ast = fromXml(pageContent);
    const ctx = createContext({ baseUrl: '/api' });
    return <div className="space-y-6">{renderNode(ast, registry, ctx)}</div>;
}
