import { useApiData } from '@/hooks/use-data';
import { getPageContentFromResponse } from '@/sdk/pages';
import { fromXml, RenderXML } from '@/xml';
import { useMemo } from 'react';

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
    const {
        data: pageXml,
        isLoading: isPageLoading,
        error: pageError,
    } = useApiData<string>(page ? `/pages/${page}` : null);
    const pageContent = useMemo(() => getPageContentFromResponse(metadata, page), [metadata, page]);
    const xmlSource = pageXml ?? pageContent;

    if (error || pageError) {
        const message = error?.message ?? pageError?.message ?? 'Unknown error';
        return <div>{message}</div>;
    }

    if (isLoading || isPageLoading) {
        return <div>Loading...</div>;
    }

    if (!xmlSource) {
        return <div>{unexpectedMessage ?? emptyMessage}</div>;
    }

    const ast = fromXml(xmlSource);
    return (
        <div className="space-y-6">
            <RenderXML ast={ast} baseUrl="/api" />
        </div>
    );
}
