import { Stack } from '@astryxdesign/core/Stack';
import { Tab as AstryxTab, TabList as AstryxTabList } from '@astryxdesign/core/TabList';
import { useState, Children, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from 'react';
import type { StoneIconName } from '@/icons';
import { Icon } from '@/components/ui/Icon';

type TabsProps = Omit<ComponentProps<typeof AstryxTabList>, 'children' | 'onChange' | 'value'> & {
    children?: ReactNode;
};
type TabProps = Omit<ComponentProps<typeof AstryxTab>, 'icon' | 'value'> & {
    children?: ReactNode;
    icon?: StoneIconName;
};

/** Renders tabs and the selected tab's content. */
export function Tabs({ children, ...props }: TabsProps) {
    const tabs = Children.toArray(children).filter(
        (child): child is ReactElement<TabProps> => isValidElement(child) && child.type === Tab
    );
    const [value, setValue] = useState(tabs[0]?.props.label ?? '');
    const activeTab = tabs.find((tab) => tab.props.label === value) ?? tabs[0];

    if (!activeTab) {
        return null;
    }

    return (
        <Stack gap={4}>
            <AstryxTabList
                {...props}
                aria-label={props['aria-label'] ?? 'Tabs'}
                onChange={setValue}
                value={activeTab.props.label}
            >
                {tabs.map((tab) => {
                    const { children: _children, icon, ...tabProps } = tab.props;

                    return (
                        <AstryxTab
                            {...tabProps}
                            icon={icon ? <Icon icon={icon} size="sm" /> : undefined}
                            key={tabProps.label}
                            value={tabProps.label}
                        />
                    );
                })}
            </AstryxTabList>
            {activeTab.props.children}
        </Stack>
    );
}

/** Defines a tab and its associated content. */
export function Tab(_props: TabProps) {
    return null;
}
