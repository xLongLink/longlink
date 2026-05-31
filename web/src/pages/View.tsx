import { fromXml, RenderXML, resolveUrl } from '@/xml';
import { useQuery } from '@tanstack/react-query';
import startCase from 'lodash/startCase';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import NotFound from './NotFound';
import XML from './XML';

type ViewProps = {
    metadata: string;
    baseurl: string;
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
    const {
        data: metadataDocument,
        isLoading,
        error,
    } = useQuery({
        queryKey: ['api', resolvedMetadata],
        queryFn: async () => {
            const response = await fetch(resolvedMetadata, {
                headers: { Accept: 'application/json' },
                credentials: 'include',
            });

            if (response.status === 404) {
                return null;
            }

            if (!response.ok) {
                throw new Error(`API request failed (${response.status})`);
            }

            return (await response.json()) as MetadataResponse;
        },
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

    /* Build tab links from metadata page names. */
    const tabs = Object.fromEntries(
        metadataDocument?.pages?.map((page) => {
            const tabValue = normalizePath(page.path.replace(/\.xml$/i, ''));
            const nextSearchParams = new URLSearchParams(searchParams);
            nextSearchParams.set('tab', tabValue);

            const href = params.app
                ? `/${params.org}/${params.app}?${nextSearchParams.toString()}`
                : params.org
                  ? `/${params.org}?${nextSearchParams.toString()}`
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
                : resolveUrl(resolvedBaseUrl, pagePath);

        setPageLoading(true);
        setPageContent(null);
        setPageContentPath(null);
        setPageError(null);
        setPageErrorPath(null);

        void fetch(pageUrl, {
            headers: { Accept: 'application/xml' },
            credentials: 'include',
            signal: controller.signal,
        })
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error(`Document request failed (${response.status})`);
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

    if (isNotFound) {
        return <NotFound />;
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
        <XML tabs={tabs}>
            <section className="space-y-6">
                <RenderXML ast={ast} baseUrl={resolvedBaseUrl} />
            </section>
        </XML>
    );
}
