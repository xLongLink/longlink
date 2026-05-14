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

        if (params.app) {
            return `/${params.org}/${params.app}?${nextSearchParams.toString()}`;
        }

        if (params.org) {
            return `/${params.org}?${nextSearchParams.toString()}`;
        }

        return `?${nextSearchParams.toString()}`;
    };

    return (
        <div className="mx-auto w-full px-6">
            <div className="flex w-full items-center gap-2 border-b border-white/10">
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
                                'relative inline-flex items-center gap-1.5 rounded-md px-2 py-1 pb-3 text-sm font-medium text-white/60 transition-colors hover:border-white/10 hover:bg-white/5 hover:text-white',
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

export default Tabs;
