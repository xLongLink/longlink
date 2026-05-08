import { Breadcrumb } from '@/components/Breadcrumb';
import { UserProfile } from '@/components/Profile';
import View from '@/components/View';
import { useApiData } from '@/hooks/use-data';
import { getActiveTabConfig, getAppTabsFromPages, type AppNavigationPage } from '@/lib/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/ui/tabs';
import { Loader2 } from 'lucide-react';
import { useMemo } from 'react';
import { Outlet, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';

type AppMetadata = {
    pages?: Array<AppNavigationPage & { content?: string }>;
};

type LongLinkProps = {
    path: string;
};

/**
 * Removes leading and trailing slashes from a route path.
 */
const normalizePath = (path: string) => path.replace(/^\/+|\/+$/g, '');

/**
 * Replaces route params in a metadata path template.
 */
const resolvePath = (path: string, params: Record<string, string | undefined>) =>
    path.replace(/:([A-Za-z0-9_]+)/g, (_, key: string) => params[key] ?? `:${key}`);

/**
 * Extracts only root-level pages from a metadata payload.
 */
const getRootPagesFromResponse = (response: unknown): AppNavigationPage[] => {
    const pages = Array.isArray(response)
        ? response
        : response && typeof response === 'object' && Array.isArray((response as AppMetadata).pages)
          ? ((response as AppMetadata).pages ?? [])
          : [];

    return pages
        .map((page) => ({
            ...page,
            path: page.path.replace(/\.xml$/i, ''),
        }))
        .filter((page) => !page.path.includes('/'));
};

/**
 * Normalizes pages API response into navigation pages with icon fallback.
 */
const toNavigationPages = (value: unknown): AppNavigationPage[] => {
    return getRootPagesFromResponse(value).map((page) => ({
        path: page.path,
        name: page.name,
        icon: page.icon ?? 'file-text',
    }));
};

/**
 * Renders metadata-backed XML pages for SDK and API routes.
 */
export default function LongLink({ path }: LongLinkProps) {
    const params = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { '*': wildcardPath } = params;
    const normalizedRoutePath = normalizePath(wildcardPath ?? '');
    const metadataPath = resolvePath(path, params);
    const isSdkMode = import.meta.env.MODE === 'sdk';

    const { data: appMetadata, isLoading: isAppMetadataLoading } = useApiData<AppMetadata>(metadataPath);

    /* Use the first configured page when no nested path is provided. */
    const fallbackPagePath = useMemo(() => {
        if (!appMetadata?.pages || appMetadata.pages.length === 0) {
            return '';
        }

        return normalizePath(appMetadata.pages[0]?.path ?? '');
    }, [appMetadata?.pages]);

    const activePagePath = normalizedRoutePath || fallbackPagePath;
    const activePage = appMetadata?.pages?.find(
        (page) => normalizePath(page.path.replace(/\.xml$/i, '')) === activePagePath
    );
    const tabs = isAppMetadataLoading
        ? [
              {
                  value: 'loading',
                  label: 'Loading',
                  path: '',
                  icon: Loader2,
              },
          ]
        : getAppTabsFromPages(toNavigationPages(appMetadata));
    const activeTabConfig = getActiveTabConfig({
        tabs,
        locationPath: location.pathname,
        basePath: params.application ? `/${params.org}/${params.application}` : params.org ? `/${params.org}` : '',
    });
    const activeTab = isAppMetadataLoading
        ? 'loading'
        : (searchParams.get('tab') ?? activeTabConfig?.value ?? tabs[0]?.value ?? '');

    return (
        <div className="min-h-screen text-white">
            <header className="border-b border-white/10">
                <div className="mx-auto w-full px-6 pb-2 pt-4">
                    <div className="flex items-center justify-between gap-4 text-white/80">
                        <div className="flex items-center gap-4">
                            <Breadcrumb />
                        </div>
                        {isSdkMode ? null : <UserProfile />}
                    </div>
                </div>

                {tabs.length > 0 ? (
                    <div className="mx-auto w-full px-6 pb-2">
                        <Tabs
                            value={activeTab}
                            onValueChange={(value) => {
                                if (isAppMetadataLoading) {
                                    return;
                                }

                                const nextTab = tabs.find((tab) => tab.value === value);
                                if (!nextTab) {
                                    return;
                                }

                                const nextSearchParams = new URLSearchParams(searchParams);
                                nextSearchParams.set('tab', nextTab.value);

                                if (params.application) {
                                    navigate(`/${params.org}/${params.application}?${nextSearchParams.toString()}`);
                                    return;
                                }

                                if (params.org) {
                                    navigate(`/${params.org}?${nextSearchParams.toString()}`);
                                    return;
                                }

                                setSearchParams(nextSearchParams, { replace: true });
                            }}
                        >
                            <TabsList variant="line" className="gap-4">
                                {tabs.map((tab) => {
                                    const Icon = tab.icon;
                                    return (
                                        <TabsTrigger
                                            key={tab.value}
                                            value={tab.value}
                                            disabled={isAppMetadataLoading}
                                            className="cursor-pointer"
                                        >
                                            <Icon
                                                className={`h-4 w-4 ${tab.value === 'loading' ? 'animate-spin' : ''}`}
                                            />
                                            {tab.label}
                                        </TabsTrigger>
                                    );
                                })}
                            </TabsList>
                        </Tabs>
                    </div>
                ) : null}
            </header>

            <main className="mx-auto w-full max-w-6xl gap-8 px-6 pb-16 pt-10">
                <section className="space-y-6">
                    {isAppMetadataLoading ? (
                        <div>Loading...</div>
                    ) : !activePagePath ? (
                        <div>No pages configured for this app.</div>
                    ) : !activePage?.content ? (
                        <div>Unexpected response format for metadata pages</div>
                    ) : (
                        <View xmlSource={activePage.content} />
                    )}
                    <Outlet />
                </section>
            </main>
        </div>
    );
}
