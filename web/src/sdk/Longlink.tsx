import { useApiData } from '@/hooks/use-data';
import { getApiBaseUrl } from '@/lib/api';
import { type AppNavigationPage } from '@/lib/navigation';
import { fromXml, RenderXML } from '@/xml';
import { useMemo } from 'react';
import { useParams } from 'react-router';
import { getPageContentFromResponse, getPagesFromResponse } from './pages';

type AppMetadata = {
    pages?: AppNavigationPage[];
};

const normalizePath = (path: string) => path.replace(/^\/+|\/+$/g, '');

export default function SdkLongLink() {
    const { '*': wildcardPath } = useParams();
    const normalizedRoutePath = normalizePath(wildcardPath ?? '');

    const { data: pagesResponse, isLoading: isAppMetadataLoading } = useApiData<AppMetadata | AppNavigationPage[]>(
        '/metadata.json'
    );

    const availablePages = useMemo(() => getPagesFromResponse(pagesResponse), [pagesResponse]);

    const fallbackPagePath = useMemo(() => {
        if (availablePages.length === 0) {
            return '';
        }

        return normalizePath(availablePages[0]?.path ?? '');
    }, [availablePages]);

    const activePagePath = normalizedRoutePath || fallbackPagePath;
    const data = activePagePath.length > 0 ? getPageContentFromResponse(pagesResponse, activePagePath) : undefined;

    if (isAppMetadataLoading) {
        return <div>Loading...</div>;
    }

    if (!activePagePath) {
        return <div>No pages configured for this app.</div>;
    }

    if (!data) {
        return <div>Unexpected response format for metadata pages</div>;
    }

    const ast = fromXml(data);
    const ctx = { setups: {}, invalidate: async () => {}, values: {} };
    return (
        <div className="space-y-6">
            <RenderXML ast={ast} ctx={ctx} baseUrl={getApiBaseUrl()} />
        </div>
    );
}
