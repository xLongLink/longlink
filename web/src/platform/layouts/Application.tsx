import startCase from 'lodash/startCase';
import { useEffect, useMemo } from 'react';
import { Link } from '@astryxdesign/core/Link';
import { Stack } from '@astryxdesign/core/Stack';
import { useQuery } from '@tanstack/react-query';
import { Center } from '@astryxdesign/core/Center';
import { TopNav } from '@astryxdesign/core/TopNav';
import { Spinner } from '@astryxdesign/core/Spinner';
import { matchRoutes, useNavigate, useParams, type RouteObject } from 'react-router';
import { api } from '@/lib/api';
import { PageError } from '@/components/Utils';
import { Wordmark } from '@/components/Wordmark';
import { resolveRequestUrl } from '@/xml/core/url';
import { Navigation } from '@/components/Navigation';
import TopLayout from '@/components/layouts/TopLayout';
import { getIconComponent } from '@/components/ui/Icon';
import NotFoundLayout from '@/components/layouts/NotFound';
import { PageContainer } from '@/components/PageContainer';
import { createContext as createXmlContext, parseXML, RenderXML } from '@/xml';
import { pageRouteIsDynamic, pageSchema, type RuntimePage } from '@/xml/pages';

/** Renders a platform application from its authenticated proxy manifest. */
export function ApplicationLayout({ applicationId }: { applicationId: string }) {
    const { organization = '', application = '', '*': wildcardPath } = useParams();
    const navigate = useNavigate();
    const basePath = `/orgs/${organization}/apps/${application}`;
    const pagesUrl = `/api/v1/applications/${applicationId}/proxy/pages.json`;
    const routePath = wildcardPath ?? '';
    const resolvedPagesBaseUrl = pagesUrl.replace(/pages\.json(?:[?#].*)?$/i, '');
    const { data: registeredPages, error } = useQuery({
        queryKey: ['api', pagesUrl],
        queryFn: async ({ signal }) => pageSchema.array().parse(await api(pagesUrl, { signal }).json()),
    });
    const activeRouteMatch = useMemo(() => {
        const [match] =
            matchRoutes(
                (registeredPages ?? []).map((page): RouteObject & { page: RuntimePage } => ({
                    path: page.route || '/',
                    page,
                })),
                `/${routePath}`
            ) ?? [];

        if (!match) return null;

        return {
            page: match.route.page,
            params: Object.fromEntries(
                Object.entries(match.params).filter((entry): entry is [string, string] => entry[1] != null)
            ),
        };
    }, [registeredPages, routePath]);
    const firstTabPage = registeredPages?.find((page) => !pageRouteIsDynamic(page.route));
    const activePage = activeRouteMatch?.page ?? (!routePath ? firstTabPage : undefined);
    const runtimeContext = useMemo(() => {
        if (!activePage) return null;

        const context = createXmlContext(activeRouteMatch?.params ?? {});

        context.services.navigationBaseUrl = basePath;
        return context;
    }, [activePage, activeRouteMatch?.params, basePath]);
    const { data: activePageAst, error: activePageError } = useQuery({
        enabled: activePage !== undefined,
        queryKey: ['application-page', pagesUrl, activePage?.path],
        queryFn: async ({ signal }) => {
            if (!activePage) throw new Error('No active application page');

            const pageUrl = resolveRequestUrl(resolvedPagesBaseUrl, activePage.path);
            const content = await api(pageUrl, { headers: { Accept: 'application/xml' }, signal }).text();

            return parseXML(content);
        },
        retry: false,
    });
    const tabGroups = new Map<string, { href: string; icon?: ReturnType<typeof getIconComponent>; label: string }>();

    // Build one proxy-prefixed navigation target per runtime tab.
    for (const page of registeredPages ?? []) {
        if (!page.route || pageRouteIsDynamic(page.route) || tabGroups.has(page.tab)) {
            continue;
        }

        tabGroups.set(page.tab, {
            href: `${basePath}/${page.route}`,
            icon: page.icon ? getIconComponent(page.icon) : undefined,
            label: page.name || startCase(page.tab),
        });
    }

    // Make the first navigable tab explicit in the proxy URL.
    useEffect(() => {
        if (!firstTabPage || routePath || !firstTabPage.route) {
            return;
        }

        navigate(`${basePath}/${firstTabPage.route}`, { replace: true });
    }, [basePath, firstTabPage, navigate, routePath]);

    /** Selects the active page result after all runtime hooks have run. */
    function renderContent() {
        if (!error && registeredPages && routePath && !activeRouteMatch) {
            return <NotFoundLayout />;
        }

        if (error) {
            return (
                <PageError
                    description={error.message || 'The application definition could not be loaded.'}
                    title="Unable to load this application"
                />
            );
        }

        if (activePageAst && runtimeContext) {
            return <RenderXML ast={activePageAst} baseUrl={resolvedPagesBaseUrl} ctx={runtimeContext} />;
        }

        if (!activePage) {
            return (
                <PageError
                    description="The application did not expose any pages to render."
                    title="Unexpected application response"
                />
            );
        }

        if (activePageError) {
            return (
                <PageError
                    description={activePageError.message || 'Failed to load page'}
                    title="Unable to load this page"
                />
            );
        }

        return (
            <Center minHeight="calc(100vh - 14rem)" width="100%">
                <Spinner label="Loading" />
            </Center>
        );
    }

    return (
        <TopLayout
            topMenu={
                <Stack>
                    <TopNav
                        className="px-7"
                        endContent={
                            <Link as="a" href="https://longlink.dev/docs" isExternalLink isStandalone>
                                Documentation
                            </Link>
                        }
                        heading={
                            <Link
                                as="a"
                                href="https://longlink.dev"
                                label="LongLink home"
                                color="inherit"
                                rel="noopener noreferrer"
                                target="_blank"
                            >
                                <Wordmark />
                            </Link>
                        }
                        label="Main navigation"
                    />
                    {tabGroups.size > 0 ? <Navigation tabs={[...tabGroups.values()]} /> : null}
                </Stack>
            }
        >
            <PageContainer minHeight="100%">{renderContent()}</PageContainer>
        </TopLayout>
    );
}
