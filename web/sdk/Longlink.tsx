import { useMemo } from 'react';
import { useParams } from 'react-router';
import Render, { type RenderNodeSchema } from '@/components/Render';
import { useApiData } from '@/hooks/use-data';
import { type AppNavigationPage } from '@/lib/navigation';

type AppMetadata = {
    pages?: AppNavigationPage[];
};

const normalizePath = (path: string) => path.replace(/^\/+|\/+$/g, '');

export default function Longlink() {
    const { '*': wildcardPath } = useParams();
    const normalizedRoutePath = normalizePath(wildcardPath ?? '');

    const { data: pagesResponse, isLoading: isAppMetadataLoading } = useApiData<AppMetadata | AppNavigationPage[]>(
        normalizedRoutePath.length === 0 ? '/pages' : null
    );

    const availablePages = useMemo(() => {
        if (Array.isArray(pagesResponse)) {
            return pagesResponse;
        }

        return pagesResponse?.pages ?? [];
    }, [pagesResponse]);

    const fallbackPagePath = useMemo(() => {
        if (availablePages.length === 0) {
            return '';
        }

        return normalizePath(availablePages[0]?.path ?? '');
    }, [availablePages]);

    const activePagePath = normalizedRoutePath || fallbackPagePath;
    const pageEndpoint = activePagePath.length > 0 ? `/${activePagePath}` : null;

    const { data, isLoading, error } = useApiData<unknown>(pageEndpoint);
    const samplePageData = Array.isArray(data) ? (data as RenderNodeSchema[]) : [];

    if (error) {
        return <div>{error.message}</div>;
    }

    if (isAppMetadataLoading || isLoading) {
        return <div>Loading...</div>;
    }

    if (!pageEndpoint) {
        return <div>No pages configured for this app.</div>;
    }

    if (data !== null && !Array.isArray(data)) {
        return <div>Unexpected response format for {pageEndpoint}</div>;
    }

    return (
        <>
            {samplePageData.map((node, index) => (
                <Render key={index} {...node} />
            ))}
        </>
    );
}
