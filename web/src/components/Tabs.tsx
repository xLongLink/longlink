import type { NavigationTab } from '@/hooks/use-tabs';
import { useTabs } from '@/hooks/use-tabs';
import { cn } from '@/lib/utils';
import { Link, useParams, useSearchParams } from 'react-router';

type TabsProps = {
    path: string;
};

/**
 * Renders metadata-backed tabs and handles tab switching.
 */
export function Tabs({ path }: TabsProps) {
    const { tabs } = useTabs(path);

    return <TabsContent tabs={tabs} />;
}

export default Tabs;

type TabsContentProps = {
    tabs: NavigationTab[];
};

/**
 * Renders the tab list and current selection.
 */
function TabsContent({ tabs }: TabsContentProps) {
    const params = useParams();
    const [searchParams] = useSearchParams();

    const selectedTab = searchParams.get('tab');
    const activeTab = tabs.some((tab) => tab.value === selectedTab) ? selectedTab : (tabs[0]?.value ?? '');

    if (tabs.length === 0) {
        return null;
    }

    const buildTabHref = (value: string) => {
        const nextSearchParams = new URLSearchParams(searchParams);
        nextSearchParams.set('tab', value);

        if (params.application) {
            return `/${params.org}/${params.application}?${nextSearchParams.toString()}`;
        }

        if (params.org) {
            return `/${params.org}?${nextSearchParams.toString()}`;
        }

        return `?${nextSearchParams.toString()}`;
    };

    return (
        <div className="mx-auto w-full px-6 pb-2">
            <div className="inline-flex items-center gap-4 border-b border-white/10">
                {tabs.map((tab) => {
                    const isActive = tab.value === activeTab;

                    return (
                        <Link
                            key={tab.value}
                            to={buildTabHref(tab.value)}
                            replace
                            aria-current={isActive ? 'page' : undefined}
                            aria-disabled={tab.value === 'loading'}
                            tabIndex={tab.value === 'loading' ? -1 : undefined}
                            className={cn(
                                'relative inline-flex items-center gap-1.5 pb-3 text-sm font-medium text-white/60 transition-colors hover:text-white',
                                tab.value === 'loading' && 'pointer-events-none opacity-50',
                                isActive &&
                                    'text-white after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-white'
                            )}
                        >
                            <tab.icon className={cn('h-4 w-4', tab.value === 'loading' && 'animate-spin')} />
                            {tab.label}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
