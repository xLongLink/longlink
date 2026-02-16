import {
    Children,
    isValidElement,
    useMemo,
    useState,
    type ReactElement,
    type ReactNode,
} from 'react';

import {
    Tabs as UITabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';

type TabsProps = {
    children?: ReactNode;
    defaultTab?: string;
};

export type TabProps = {
    name: string;
    children?: ReactNode;
};

type ParsedTab = {
    name: string;
    children?: ReactNode;
};

export function Tab({ children }: TabProps) {
    return <>{children}</>;
}

export function Tabs({ children, defaultTab }: TabsProps) {
    const tabs = useMemo<ParsedTab[]>(() => {
        return Children.toArray(children)
            .filter((child): child is ReactElement<TabProps> => {
                return isValidElement(child) && child.type === Tab;
            })
            .map((tab) => ({
                name: tab.props.name,
                children: tab.props.children,
            }))
            .filter((tab) => Boolean(tab.name));
    }, [children]);

    const firstTab = tabs[0]?.name;
    const [selectedTab, setSelectedTab] = useState<string | undefined>();

    const activeTab = useMemo(() => {
        if (defaultTab && tabs.some((tab) => tab.name === defaultTab)) {
            return defaultTab;
        }

        if (selectedTab && tabs.some((tab) => tab.name === selectedTab)) {
            return selectedTab;
        }

        return firstTab;
    }, [defaultTab, firstTab, selectedTab, tabs]);

    if (!tabs.length || !activeTab) {
        return null;
    }

    return (
        <UITabs value={activeTab} onValueChange={setSelectedTab}>
            <TabsList>
                {tabs.map((tab) => (
                    <TabsTrigger
                        key={`tab-trigger-${tab.name}`}
                        value={tab.name}
                    >
                        {tab.name}
                    </TabsTrigger>
                ))}
            </TabsList>

            {tabs.map((tab) => (
                <TabsContent key={`tab-content-${tab.name}`} value={tab.name}>
                    <div className="space-y-4">{tab.children}</div>
                </TabsContent>
            ))}
        </UITabs>
    );
}

export default Tabs;
