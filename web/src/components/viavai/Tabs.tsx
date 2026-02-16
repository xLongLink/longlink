import {
    Children,
    isValidElement,
    useMemo,
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
    tabs: string[];
    children?: ReactNode;
};

export type TabProps = {
    name: string;
    children?: ReactNode;
};

type ParsedTab = {
    name?: string;
    children?: ReactNode;
};

export function Tab({ children }: TabProps) {
    return <>{children}</>;
}

export function Tabs({ tabs, children }: TabsProps) {
    const parsedTabs = useMemo<ParsedTab[]>(() => {
        return Children.toArray(children)
            .filter((child): child is ReactElement<TabProps> => {
                return isValidElement(child) && child.type === Tab;
            })
            .map((tab) => ({
                name: tab.props.name,
                children: tab.props.children,
            }));
    }, [children]);

    const tabItems = useMemo(
        () =>
            tabs.map((name, index) => {
                const tabByName = parsedTabs.find((tab) => tab.name === name);

                return {
                    name,
                    children:
                        tabByName?.children ?? parsedTabs[index]?.children,
                };
            }),
        [parsedTabs, tabs]
    );

    if (!tabItems.length) {
        return null;
    }

    return (
        <UITabs defaultValue={tabItems[0]?.name}>
            <TabsList>
                {tabItems.map((tab) => (
                    <TabsTrigger
                        key={`tab-trigger-${tab.name}`}
                        value={tab.name}
                    >
                        {tab.name}
                    </TabsTrigger>
                ))}
            </TabsList>

            {tabItems.map((tab) => (
                <TabsContent key={`tab-content-${tab.name}`} value={tab.name}>
                    <div className="space-y-4">{tab.children}</div>
                </TabsContent>
            ))}
        </UITabs>
    );
}

export default Tabs;
