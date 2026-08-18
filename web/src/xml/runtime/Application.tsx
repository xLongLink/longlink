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
import { Navigation } from '@/components/Navigation';
import TopLayout from '@/components/layouts/TopLayout';
import { getIconComponent } from '@/components/ui/Icon';
import NotFoundLayout from '@/components/layouts/NotFound';
import { PageContainer } from '@/components/PageContainer';
import { resolveRequestUrl } from '../core/url';
import { createContext as createXmlContext, parseXML, RenderXML } from '..';
import { pageRouteIsDynamic, pageSchema, type RuntimePage } from '../pages';

type XmlApplicationProps = {
    navigationBaseUrl: string;
    pagesUrl: string;
    requestBaseUrl: string;
};

/** Renders a manifest-driven XML application within a host-specific URL context. */
export function XmlApplication({ navigationBaseUrl, pagesUrl, requestBaseUrl }: XmlApplicationProps) {
    const { '*': wildcardPath } = useParams();
    const navigate = useNavigate();
    const routePath = wildcardPath ?? '';
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

    // Resolve explicit browser routes first so dynamic detail views can share a tab with their list page.
    const activePage = activeRouteMatch?.page ?? (!routePath ? firstTabPage : undefined);
    const runtimeContext = useMemo(() => {
        if (!activePage) return null;

        const context = createXmlContext(activeRouteMatch?.params ?? {});

        context.services.navigationBaseUrl = navigationBaseUrl;
        return context;
    }, [activePage, activeRouteMatch?.params, navigationBaseUrl]);
    const { data: activePageAst, error: activePageError } = useQuery({
        enabled: activePage !== undefined,
        queryKey: ['application-page', pagesUrl, activePage?.path],
        queryFn: async ({ signal }) => {
            if (!activePage) throw new Error('No active application page');

            const pageUrl = resolveRequestUrl(requestBaseUrl, activePage.path);
            const content = await api(pageUrl, { headers: { Accept: 'application/xml' }, signal }).text();

            return parseXML(content);
        },
        retry: false,
    });
    const tabGroups = new Map<string, { href: string; icon?: ReturnType<typeof getIconComponent>; label: string }>();

    // Build one static navigation target per runtime tab.
    for (const page of registeredPages ?? []) {
        if (!page.route || pageRouteIsDynamic(page.route) || tabGroups.has(page.tab)) {
            continue;
        }

        tabGroups.set(page.tab, {
            href: `${navigationBaseUrl === '/' ? '' : navigationBaseUrl}/${page.route}`,
            icon: page.icon ? getIconComponent(page.icon) : undefined,
            label: page.name || startCase(page.tab),
        });
    }

    // Make the first navigable tab explicit in the URL when the app loads without a selected view.
    useEffect(() => {
        if (!firstTabPage || routePath || !firstTabPage.route) {
            return;
        }

        navigate(`${navigationBaseUrl === '/' ? '' : navigationBaseUrl}/${firstTabPage.route}`, { replace: true });
    }, [firstTabPage, navigate, navigationBaseUrl, routePath]);

    let content;

    if (!error && registeredPages && routePath && !activeRouteMatch) {
        content = <NotFoundLayout />;
    } else if (error) {
        content = (
            <PageError
                description={error.message || 'The application definition could not be loaded.'}
                title="Unable to load this application"
            />
        );
    } else if (activePageAst && runtimeContext) {
        content = <RenderXML ast={activePageAst} baseUrl={requestBaseUrl} ctx={runtimeContext} />;
    } else if (!activePage) {
        content = (
            <PageError
                description="The application did not expose any pages to render."
                title="Unexpected application response"
            />
        );
    } else if (activePageError) {
        content = (
            <PageError
                description={activePageError.message || 'Failed to load page'}
                title="Unable to load this page"
            />
        );
    } else {
        content = (
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
            <PageContainer minHeight="100%">{content}</PageContainer>
        </TopLayout>
    );
}
