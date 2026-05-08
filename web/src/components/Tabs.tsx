import type { NavigationTab } from '@/hooks/use-tabs';
import { useTabs } from '@/hooks/use-tabs';
import { TabsList, TabsTrigger, Tabs as UITabs } from '@/ui/tabs';
import { useNavigate, useParams, useSearchParams } from 'react-router';

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

type TabsContentProps = {
    tabs: NavigationTab[];
};

/**
 * Renders the tab list and current selection.
 */
function TabsContent({ tabs }: TabsContentProps) {
    const params = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const activeTab = searchParams.get('tab') ?? tabs[0]?.value ?? '';

    if (tabs.length === 0) {
        return null;
    }

    return (
        <div className="mx-auto w-full px-6 pb-2">
            <UITabs
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
                        return (
                            <TabsTrigger
                                key={tab.value}
                                value={tab.value}
                                disabled={tab.value === 'loading'}
                                className="cursor-pointer"
                            >
                                <tab.icon className={`h-4 w-4 ${tab.value === 'loading' ? 'animate-spin' : ''}`} />
                                {tab.label}
                            </TabsTrigger>
                        );
                    })}
                </TabsList>
            </UITabs>
        </div>
    );
}
