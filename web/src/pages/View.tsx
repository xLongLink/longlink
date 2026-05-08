import View from '@/components/View';
import { getPageContentFromResponse } from '@/sdk/pages';
import { useMemo } from 'react';

type ViewProps = {
    metadata: unknown;
    page: string;
    emptyMessage: string;
    unexpectedMessage: string;
};

/**
 * Renders XML page content from a metadata response.
 */
export default function PageView({ metadata, page, emptyMessage, unexpectedMessage }: ViewProps) {
    const xmlSource = useMemo(() => getPageContentFromResponse(metadata, page), [metadata, page]);

    if (!xmlSource) {
        return <div>{unexpectedMessage ?? emptyMessage}</div>;
    }

    return <View xmlSource={xmlSource} />;
}
