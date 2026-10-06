import { Stack } from '@astryxdesign/core/Stack';
import { Tab as AstryxTab, TabList } from '@astryxdesign/core/TabList';
import { Children, isValidElement, useId, useState, type ReactElement, type ReactNode } from 'react';

type TabProps = { children?: ReactNode; value: string; label: string; isDisabled?: boolean; panelId?: string };
type TabsProps = {
    children?: ReactNode;
    gap?: 0 | 0.5 | 1 | 1.5 | 2 | 3 | 4 | 5 | 6 | 8 | 10;
    hasDivider?: boolean;
    onChange?: (value: string) => void;
    value?: string;
};

/** Renders a tab strip and mounts only the selected Tab's content. */
export function Tabs({ children, gap = 3, onChange, value: controlledValue, ...props }: TabsProps) {
    const instance = useId();
    const [selection, setSelection] = useState('');

    // Resolve JSX tabs once, falling back to the first tab for missing selections.
    const tabs = Children.toArray(children).filter(
        (child): child is ReactElement<TabProps> => isValidElement(child) && child.type === Tab
    );
    const activeTab = tabs.find((tab) => tab.props.value === (controlledValue ?? selection)) ?? tabs[0];
    if (!activeTab) return null;
    const panelId = activeTab.props.panelId ?? `${instance}-${activeTab.props.value}`;

    // Link each tab to the one content panel owned by this Tabs instance.
    return (
        <Stack gap={gap}>
            <TabList
                {...props}
                hasDivider={props.hasDivider ?? false}
                role="tablist"
                value={activeTab.props.value}
                onChange={(value) => {
                    if (controlledValue === undefined) setSelection(value);
                    onChange?.(value);
                }}
            >
                {tabs.map((tab) => {
                    const { children: _content, ...tabProps } = tab.props;

                    // Keep panel content out of the underlying tab button props.
                    return (
                        <AstryxTab
                            {...tabProps}
                            key={tab.props.value}
                            panelId={tab.props.panelId ?? `${instance}-${tab.props.value}`}
                        />
                    );
                })}
            </TabList>
            <Stack id={panelId} role="tabpanel" tabIndex={0} aria-label={activeTab.props.label} gap={gap}>
                {activeTab.props.children}
            </Stack>
        </Stack>
    );
}

/** Defines a tab and the content rendered when it is selected. */
export function Tab(_props: TabProps) {
    return null;
}
