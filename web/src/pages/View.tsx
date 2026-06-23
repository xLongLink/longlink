import { useApiQuery } from '@/hooks/use-api';
import XML from '@/layout/XmlLayout';
import { fetchApiText } from '@/lib/api';
import { fromXml, RenderXML, resolveUrl } from '@/xml';
import { Skeleton } from '@ui/skeleton';
import startCase from 'lodash/startCase';
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import NotFound from './NotFound';

type ViewProps = {
    metadata: string;
};

type MetadataPage = {
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
export default function View({ metadata }: ViewProps) {
    const params = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [pageContent, setPageContent] = useState<string | null>(null);
    const [pageContentPath, setPageContentPath] = useState<string | null>(null);
    const [pageError, setPageError] = useState<string | null>(null);
    const [pageErrorPath, setPageErrorPath] = useState<string | null>(null);
    const [pageLoading, setPageLoading] = useState(false);
    const routeParams = params as Record<string, string | undefined>;
    const { '*': wildcardPath } = params;
    const resolvedMetadata = resolveTemplate(metadata, routeParams);
    const resolvedMetadataBaseUrl = resolvedMetadata.replace(/metadata\.json(?:[?#].*)?$/i, '');
    const {
        data: metadataDocument,
        isLoading,
        error,
    } = useApiQuery<MetadataResponse | null>(resolvedMetadata, {
        notFound: null,
    });
    const normalizedRoutePath = normalizePath(wildcardPath ?? '');
    const selectedTab = searchParams.get('tab');
    /* Resolve the active page from the selected tab path first, then the route path. */
    const activePage =
        metadataDocument?.pages?.find((page) => normalizePath(page.path.replace(/\.xml$/i, '')) === selectedTab) ??
        metadataDocument?.pages?.find(
            (page) => normalizePath(page.path.replace(/\.xml$/i, '')) === normalizedRoutePath
        ) ??
        metadataDocument?.pages?.[0];
    const isNotFound = metadataDocument === null;

    // Make the first tab explicit in the URL when the page loads without a tab selection.
    useEffect(() => {
        if (!metadataDocument?.pages?.length || selectedTab || normalizedRoutePath) {
            return;
        }

        const firstTab = normalizePath(metadataDocument.pages[0].path.replace(/\.xml$/i, ''));
        const nextSearchParams = new URLSearchParams(searchParams);
        nextSearchParams.set('tab', firstTab);

        navigate(`?${nextSearchParams.toString()}`, { replace: true });
    }, [metadataDocument?.pages, navigate, normalizedRoutePath, searchParams, selectedTab]);

    /* Build tab links from metadata page names. */
    const tabs = Object.fromEntries(
        metadataDocument?.pages?.map((page) => {
            const tabValue = normalizePath(page.path.replace(/\.xml$/i, ''));
            const nextSearchParams = new URLSearchParams(searchParams);
            nextSearchParams.set('tab', tabValue);

            const href = params.app
                ? `/orgs/${params.org}/apps/${params.app}?${nextSearchParams.toString()}`
                : params.org
                  ? `/orgs/${params.org}?${nextSearchParams.toString()}`
                  : `?${nextSearchParams.toString()}`;

            return [startCase(tabValue), href] as const;
        }) ?? []
    );

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
                : resolveUrl(resolvedMetadataBaseUrl, pagePath);

        setPageLoading(true);
        setPageContent(null);
        setPageContentPath(null);
        setPageError(null);
        setPageErrorPath(null);

        void fetchApiText(pageUrl, {
            headers: { Accept: 'application/xml' },
            signal: controller.signal,
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
    }, [activePage?.path, resolvedMetadataBaseUrl]);

    if (error) {
        return <div>{error.message}</div>;
    }

    if (isNotFound) {
        return <NotFound />;
    }

    if (pageError && pageErrorPath === activePage?.path) {
        return <div>{pageError}</div>;
    }

    if (isLoading || pageLoading || (activePage && pageContentPath !== activePage.path)) {
        // Keep the XML shell mounted while metadata or page content is still loading.
        return (
            <XML tabs={tabs}>
                <section className="space-y-6">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-5 w-[28rem] max-w-full" />
                    <div className="grid gap-4 lg:grid-cols-2">
                        <Skeleton className="h-48 w-full" />
                        <Skeleton className="h-48 w-full" />
                    </div>
                </section>
            </XML>
        );
    }

    if (!activePage) {
        return <div>Unexpected response format</div>;
    }

    if (!pageContent) {
        return <div>Unexpected response format</div>;
    }

    const ast = fromXml(pageContent);

    return (
        <XML tabs={tabs}>
            <section className="space-y-6">
                <RenderXML ast={ast} baseUrl={resolvedMetadataBaseUrl} />
            </section>
        </XML>
    );
}
