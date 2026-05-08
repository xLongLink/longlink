import { Breadcrumb } from '@/components/Breadcrumb';
import { UserProfile } from '@/components/Profile';
import View from '@/components/View';
import { useTabs } from '@/hooks/use-tabs';
import { getActiveTabConfig, type AppNavigationPage } from '@/lib/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/ui/tabs';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router';

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

    const { tabs } = useTabs(metadataPath);

    const activePagePath = normalizedRoutePath;
    const activePage = tabs?.find(
        (page) => normalizePath((page as AppNavigationPage).path.replace(/\.xml$/i, '')) === activePagePath
    ) as (AppNavigationPage & { content?: string }) | undefined;
    const activeTabConfig = getActiveTabConfig({
        tabs,
        locationPath: location.pathname,
        basePath: params.application ? `/${params.org}/${params.application}` : params.org ? `/${params.org}` : '',
    });
    const activeTab = searchParams.get('tab') ?? activeTabConfig?.value ?? tabs[0]?.value ?? '';

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

                {tabs.length > 0 ? (
                    <div className="mx-auto w-full px-6 pb-2">
                        <Tabs
                            value={activeTab}
                            onValueChange={(value) => {
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
                                            disabled={tab.value === 'loading'}
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
                    <View xmlSource={activePage?.content ?? null} />
                </section>
            </main>
        </div>
    );
}
