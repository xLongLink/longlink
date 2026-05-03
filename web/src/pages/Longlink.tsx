import { useApiData } from '@/hooks/use-data';
import { type AppNavigationPage } from '@/lib/navigation';
import { useMemo } from 'react';
import { useParams } from 'react-router';
import View from './View';

type AppMetadata = {
    pages?: Array<AppNavigationPage & { content?: string }>;
};

type LonglinkProps = {
    appId?: string;
};

/**
 * Removes leading and trailing slashes from a route path.
 */
const normalizePath = (path: string) => path.replace(/^\/+|\/+$/g, '');

export default function Longlink({ appId: appIdOverride }: LonglinkProps) {
    const { appId: routeAppId, '*': wildcardPath } = useParams();
    const appId = appIdOverride ?? routeAppId;
    const normalizedRoutePath = normalizePath(wildcardPath ?? '');

    const { data: appMetadata, isLoading: isAppMetadataLoading } = useApiData<AppMetadata>(
        appId && normalizedRoutePath.length === 0 ? `/apps/${appId}/metadata` : null
    );

    /* Use the first configured page when no nested path is provided. */
    const fallbackPagePath = useMemo(() => {
        if (!appMetadata?.pages || appMetadata.pages.length === 0) {
            return '';
        }

        return normalizePath(appMetadata.pages[0]?.path ?? '');
    }, [appMetadata?.pages]);

    const activePagePath = normalizedRoutePath || fallbackPagePath;
    return (
        <View
            metadata={appMetadata}
            page={activePagePath}
            isLoading={isAppMetadataLoading}
            emptyMessage="No pages configured for this app."
            unexpectedMessage="Unexpected response format for metadata pages"
        />
    );
}
