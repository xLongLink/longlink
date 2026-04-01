import { useMemo } from 'react';
import { useParams } from 'react-router';
import Render, { type RenderNodeSchema } from '@/components/Render';
import { useApiData } from '@/hooks/use-data';
import { type AppNavigationPage } from '@/lib/navigation';

type AppMetadata = {
    pages?: AppNavigationPage[];
};

const sdkAppId = import.meta.env.VITE_SDK_APP_ID;
const normalizePath = (path: string) => path.replace(/^\/+|\/+$/g, '');

export default function Longlink() {
    const { '*': wildcardPath } = useParams();
    const normalizedRoutePath = normalizePath(wildcardPath ?? '');

    const { data: appMetadata, isLoading: isAppMetadataLoading } =
        useApiData<AppMetadata>(
            sdkAppId && normalizedRoutePath.length === 0
                ? `/apps/${sdkAppId}`
                : null
        );

    const fallbackPagePath = useMemo(() => {
        if (!appMetadata?.pages || appMetadata.pages.length === 0) {
            return '';
        }

        return normalizePath(appMetadata.pages[0]?.path ?? '');
    }, [appMetadata?.pages]);

    const activePagePath = normalizedRoutePath || fallbackPagePath;
    const pageEndpoint = sdkAppId
        ? activePagePath.length > 0
            ? `/apps/${sdkAppId}/${activePagePath}`
            : null
        : null;

    const { data, isLoading, error } = useApiData<unknown>(pageEndpoint);
    const samplePageData = Array.isArray(data)
        ? (data as RenderNodeSchema[])
        : [];

    if (!sdkAppId) {
        return <div>Missing VITE_SDK_APP_ID configuration.</div>;
    }

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
