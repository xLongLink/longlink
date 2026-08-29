import { Stack } from '@astryxdesign/core/Stack';
import { Icon, type StoneIconName } from '@/components/ui/Icon';
import { Tab as AstryxTab, TabList as AstryxTabList } from '@astryxdesign/core/TabList';
import { useState, Children, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from 'react';

type AstryxTabListProps = ComponentProps<typeof AstryxTabList>;

type TabsProps = Omit<AstryxTabListProps, 'children' | 'onChange' | 'value'> & {
    children?: ReactNode;
    gap?: ComponentProps<typeof Stack>['gap'];
    onChange?: AstryxTabListProps['onChange'];
    value?: AstryxTabListProps['value'];
};
type TabProps = Omit<ComponentProps<typeof AstryxTab>, 'icon'> & {
    children?: ReactNode;
    icon?: StoneIconName;
};

/** Renders tabs and the selected tab's content. */
export function Tabs({ children, gap = 3, ...props }: TabsProps) {
    const tabs = Children.toArray(children).filter(
        (child): child is ReactElement<TabProps> => isValidElement(child) && child.type === Tab
    );
    const [uncontrolledValue, setUncontrolledValue] = useState(tabs[0]?.props.value ?? '');
    const { onChange, value: controlledValue, ...tabListProps } = props;
    const value = controlledValue ?? uncontrolledValue;
    const activeTab = tabs.find((tab) => tab.props.value === value) ?? tabs[0];

    if (!activeTab) {
        return null;
    }

    return (
        <Stack gap={gap}>
            <AstryxTabList
                {...tabListProps}
                onChange={(nextValue) => {
                    if (controlledValue === undefined) {
                        setUncontrolledValue(nextValue);
                    }

                    onChange?.(nextValue);
                }}
                value={value}
            >
                {tabs.map((tab) => {
                    const { children: _children, icon, ...tabProps } = tab.props;

                    return (
                        <AstryxTab
                            {...tabProps}
                            icon={icon ? <Icon icon={icon} size="sm" /> : undefined}
                            key={tabProps.label}
                        />
                    );
                })}
            </AstryxTabList>
            <Stack gap={gap}>{activeTab.props.children}</Stack>
        </Stack>
    );
}

/** Defines a tab and its associated content. */
export function Tab(_props: TabProps) {
    return null;
}
