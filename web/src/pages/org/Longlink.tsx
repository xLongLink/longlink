import Render, { type RenderNodeSchema } from '@/components/Render';
import { useData } from '@/hooks/use-data';
import { type AppNavigationPage } from '@/lib/navigation';
import { useMemo } from 'react';
import { useParams } from 'react-router';

type AppMetadata = {
    pages?: AppNavigationPage[];
};

const normalizePath = (path: string) => path.replace(/^\/+|\/+$/g, '');

export default function Longlink() {
    const { app, '*': wildcardPath } = useParams();
    const normalizedRoutePath = normalizePath(wildcardPath ?? '');

    const { data: appMetadata, isLoading: isAppMetadataLoading } =
        useData<AppMetadata>(
            app && normalizedRoutePath.length === 0 ? `/apps/${app}` : null
        );

    const fallbackPagePath = useMemo(() => {
        if (!appMetadata?.pages || appMetadata.pages.length === 0) {
            return '';
        }

        return normalizePath(appMetadata.pages[0]?.path ?? '');
    }, [appMetadata?.pages]);

    const activePagePath = normalizedRoutePath || fallbackPagePath;
    const pageEndpoint = app
        ? activePagePath.length > 0
            ? `/apps/${app}/${activePagePath}`
            : null
        : null;

    const { data, isLoading, error } = useData<unknown>(pageEndpoint);

    const samplePageData = Array.isArray(data)
        ? (data as RenderNodeSchema[])
        : [];

    if (error) {
        return <div>{error}</div>;
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
