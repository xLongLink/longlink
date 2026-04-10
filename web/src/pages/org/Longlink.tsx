import Render, { normalizeRenderRoots, type RenderNodeSchema } from '@/components/Render';
import { useApiData } from '@/hooks/use-data';
import { type AppNavigationPage } from '@/lib/navigation';
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

    const { data, isLoading, error } = useApiData<unknown>(pageEndpoint);

    const pageData = normalizeRenderRoots(data) as RenderNodeSchema[];

    if (error) {
        return <div>{error.message}</div>;
    }

    if (isAppMetadataLoading || isLoading) {
        return <div>Loading...</div>;
    }

    if (!pageEndpoint) {
        return <div>No pages configured for this app.</div>;
    }

    if (data !== null && pageData.length === 0) {
        return <div>Unexpected response format for {pageEndpoint}</div>;
    }

    return (
        <>
            {pageData.map((node, index) => (
                <Render key={index} node={node} />
            ))}
        </>
    );
}
