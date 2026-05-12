import { Breadcrumb } from '@/components/Breadcrumb';
import { UserProfile } from '@/components/Profile';
import Tabs from '@/components/Tabs';
import { useApiData } from '@/hooks/use-data';
import { fromXml, RenderXML, resolveUrl } from '@/xml';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';

type ViewProps = {
    metadata: string;
    baseurl: string;
};

type MetadataPage = {
    name?: string;
    path: string;
};

type MetadataResponse = {
    pages?: MetadataPage[];
};

/**
 * Removes leading and trailing slashes from a route path.
 */
function normalizePath(path: string): string {
    return path.replace(/^\/+|\/+$/g, '');
}

/**
 * Resolves route params inside a URL template.
 */
function resolveTemplate(template: string, params: Record<string, string | undefined>): string {
    return template
        .replace(/:([A-Za-z0-9_]+)/g, (_, key: string) => params[key] ?? `:${key}`)
        .replace(/\{([A-Za-z0-9_]+)\}/g, (_, key: string) => params[key] ?? `{${key}}`);
}

/**
 * Renders metadata-backed XML pages for control-plane and app routes.
 */
export default function View({ metadata, baseurl }: ViewProps) {
    const params = useParams();
    const [searchParams] = useSearchParams();
    const [pageContent, setPageContent] = useState<string | null>(null);
    const [pageContentPath, setPageContentPath] = useState<string | null>(null);
    const [pageError, setPageError] = useState<string | null>(null);
    const [pageErrorPath, setPageErrorPath] = useState<string | null>(null);
    const [pageLoading, setPageLoading] = useState(false);
    const routeParams = params as Record<string, string | undefined>;
    const { '*': wildcardPath } = params;
    const resolvedMetadata = resolveTemplate(metadata, routeParams);
    const resolvedBaseUrl = resolveTemplate(baseurl, routeParams);
    const { data: metadataDocument, isLoading, error } = useApiData<MetadataResponse>(resolvedMetadata);
    const normalizedRoutePath = normalizePath(wildcardPath ?? '');
    const selectedTab = searchParams.get('tab');
    const activePageKey = normalizePath((selectedTab ?? normalizedRoutePath).replace(/\.xml$/i, ''));
    const activePage =
        metadataDocument?.pages?.find((page) => normalizePath(page.path.replace(/\.xml$/i, '')) === activePageKey) ??
        metadataDocument?.pages?.[0];

    /* Load the active page XML from its path. */
    useEffect(() => {
        if (!activePage) {
            setPageContent(null);
            setPageContentPath(null);
            setPageError(null);
            setPageErrorPath(null);
            setPageLoading(false);
            return;
        }

        const controller = new AbortController();
        const pagePath = activePage.path.startsWith('/') ? activePage.path : `/${activePage.path}`;
        const pageUrl =
            activePage.path.startsWith('http://') || activePage.path.startsWith('https://')
                ? activePage.path
                : resolveUrl(resolvedBaseUrl, pagePath);

        setPageLoading(true);
        setPageContent(null);
        setPageContentPath(null);
        setPageError(null);
        setPageErrorPath(null);

        void fetch(pageUrl, {
            headers: { Accept: 'application/xml' },
            credentials: 'same-origin',
            signal: controller.signal,
        })
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error(`Page request failed (${response.status})`);
                }

                return response.text();
            })
            .then((content) => {
                if (!controller.signal.aborted) {
                    setPageContent(content);
                    setPageContentPath(activePage.path);
                    setPageLoading(false);
                }
            })
            .catch((fetchError: unknown) => {
                if (controller.signal.aborted) {
                    return;
                }

                setPageError(fetchError instanceof Error ? fetchError.message : 'Failed to load page');
                setPageErrorPath(activePage.path);
                setPageLoading(false);
            });

        return () => controller.abort();
    }, [activePage?.path, resolvedBaseUrl]);

    if (error) {
        return <div>{error.message}</div>;
    }

    if (pageError && pageErrorPath === activePage?.path) {
        return <div>{pageError}</div>;
    }

    if (!activePage) {
        return <div>Unexpected response format</div>;
    }

    if (isLoading || pageLoading || pageContentPath !== activePage?.path) {
        return <div>Loading...</div>;
    }

    if (!pageContent) {
        return <div>Unexpected response format</div>;
    }

    const ast = fromXml(pageContent);

    return (
        <div className="min-h-screen text-white">
            <header className="border-b border-white/10">
                <div className="mx-auto w-full px-6 pb-2 pt-4">
                    <div className="flex items-center justify-between gap-4 text-white/80">
                        <div className="flex items-center gap-4">
                            <Breadcrumb />
                        </div>
                        <UserProfile />
                    </div>
                </div>

                <Tabs path={resolvedMetadata} />
            </header>

            <main className="mx-auto w-full max-w-6xl gap-8 px-6 pb-16 pt-10">
                <section className="space-y-6">
                    <RenderXML ast={ast} baseUrl={resolvedBaseUrl} />
                </section>
            </main>
        </div>
    );
}
