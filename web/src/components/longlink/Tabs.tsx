import { type ReactNode } from 'react';

import {
    Tabs as UITabs,
    TabsList,
    TabsContent,
    TabsTrigger,
} from '@/components/ui/tabs';

type TabsProps = {
    tabs: string[];
    children?: ReactNode;
};

type TabProps = {
    name: string;
    children?: ReactNode;
};

export function Tab({ name, children }: TabProps) {
    return <TabsContent value={name}>{children}</TabsContent>;
}

export function Tabs({ tabs, children }: TabsProps) {
    return (
        <UITabs defaultValue={tabs[0]}>
            <TabsList>
                {tabs.map((tab) => (
                    <TabsTrigger
                        key={`tab-trigger-${tab}`}
                        value={tab}
                        className="cursor-pointer"
                    >
                        {tab}
                    </TabsTrigger>
                ))}
            </TabsList>

            {children}
        </UITabs>
    );
}

export default Tabs;
