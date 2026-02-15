import {
    Children,
    isValidElement,
    useEffect,
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

type ParsedTabProps = {
    title?: string;
    props?: {
        title?: string;
    };
    children?: ReactNode;
};

type TabProps = ParsedTabProps & {
    title: string;
};

export function Tab({ children }: TabProps) {
    return <>{children}</>;
}

export function Tabs({ children, defaultTab }: TabsProps) {
    const tabs = Children.toArray(children).filter(
        (child) => isValidElement(child) && child.type === Tab
    ) as ReactElement<ParsedTabProps>[];

    const firstTab = useMemo(() => {
        if (tabs.length === 0) {
            return undefined;
        }

        const first = tabs[0].props;
        return first.title ?? first.props?.title;
    }, [tabs]);

    const [activeTab, setActiveTab] = useState<string | undefined>(
        defaultTab ?? firstTab
    );

    useEffect(() => {
        if (
            !activeTab ||
            !tabs.some(
                (tab) =>
                    (tab.props.title ?? tab.props.props?.title) === activeTab
            )
        ) {
            setActiveTab(defaultTab ?? firstTab);
        }
    }, [activeTab, defaultTab, firstTab, tabs]);

    if (!tabs.length) {
        return null;
    }

    return (
        <UITabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList variant="line">
                {tabs.map((tab, index) => {
                    const title = tab.props.title ?? tab.props.props?.title;

                    if (!title) {
                        return null;
                    }

                    return (
                        <TabsTrigger key={`tab-trigger-${index}`} value={title}>
                            {title}
                        </TabsTrigger>
                    );
                })}
            </TabsList>

            {tabs.map((tab, index) => {
                const title = tab.props.title ?? tab.props.props?.title;

                if (!title) {
                    return null;
                }

                return (
                    <TabsContent key={`tab-content-${index}`} value={title}>
                        <div className="space-y-4">{tab.props.children}</div>
                    </TabsContent>
                );
            })}
        </UITabs>
    );
}

export default Tabs;
