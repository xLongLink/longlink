import { Breadcrumb } from '@/components/Breadcrumb';
import { UserProfile } from '@/components/Profile';
import Tabs from '@/components/Tabs';
import { useApiData } from '@/hooks/use-data';
import { fromXml, RenderXML } from '@/xml';
import { useParams, useSearchParams } from 'react-router';

type ViewProps = {
    metadata: string;
    baseurl: string;
};

type MetadataPage = {
    path: string;
    content?: string;
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
    const routeParams = params as Record<string, string | undefined>;
    const { '*': wildcardPath } = params;
    const resolvedMetadata = resolveTemplate(metadata, routeParams);
    const resolvedBaseUrl = resolveTemplate(baseurl, routeParams);
    const { data: metadataDocument, isLoading, error } = useApiData<MetadataResponse>(resolvedMetadata);
    const normalizedRoutePath = normalizePath(wildcardPath ?? '');
    const selectedTab = searchParams.get('tab');
    const activePageKey = selectedTab ?? normalizedRoutePath;
    const activePage =
        metadataDocument?.pages?.find((page) => normalizePath(page.path.replace(/\.xml$/i, '')) === activePageKey) ??
        metadataDocument?.pages?.[0];

    if (error) {
        return <div>{error.message}</div>;
    }

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (!activePage?.content) {
        return <div>Unexpected response format</div>;
    }

    const ast = fromXml(activePage.content);

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
