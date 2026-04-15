import Render from '@/components/Render';
import { useApiData } from '@/hooks/use-data';
import { type AppNavigationPage } from '@/lib/navigation';
import { resolveXmlPayload } from '@/lib/xml';
import { useMemo } from 'react';
import { useParams } from 'react-router';

type AppMetadata = {
    pages?: AppNavigationPage[];
};

const normalizePath = (path: string) => path.replace(/^\/+|\/+$/g, '');

export default function Longlink() {
    const { appId, '*': wildcardPath } = useParams();
    const normalizedRoutePath = normalizePath(wildcardPath ?? '');

    const { data: appMetadata, isLoading: isAppMetadataLoading } = useApiData<AppMetadata>(
        appId && normalizedRoutePath.length === 0 ? `/apps/${appId}` : null
    );

    const fallbackPagePath = useMemo(() => {
        if (!appMetadata?.pages || appMetadata.pages.length === 0) {
            return '';
        }

        return normalizePath(appMetadata.pages[0]?.path ?? '');
    }, [appMetadata?.pages]);

    const activePagePath = normalizedRoutePath || fallbackPagePath;
    const pageEndpoint = appId ? (activePagePath.length > 0 ? `/apps/${appId}/pages/${activePagePath}` : null) : null;

    const { data, isLoading, error } = useApiData<string | { xml?: string | null; content?: string | null }>(
        pageEndpoint
    );
    const xml = resolveXmlPayload(data);

    if (error) {
        return <div>{error.message}</div>;
    }

    if (isAppMetadataLoading || isLoading) {
        return <div>Loading...</div>;
    }

    if (!pageEndpoint) {
        return <div>No pages configured for this app.</div>;
    }

    if (!xml) {
        return <div>Unexpected response format for {pageEndpoint}</div>;
    }

    return <Render xml={xml} />;
}
