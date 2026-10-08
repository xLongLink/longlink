import { Stack } from '@astryxdesign/core/Stack';
import { Tab as AstryxTab, TabList } from '@astryxdesign/core/TabList';
import { Children, isValidElement, useId, useState, type ReactElement, type ReactNode } from 'react';

type TabProps = {
    /** Panel content mounted only while this tab is selected. */
    children?: ReactNode;
    /** Unique value identifying this tab. */
    value: string;
    /** Visible tab label and accessible panel name. */
    label: string;
    /** Whether the tab is disabled. */
    isDisabled?: boolean;
};

type TabsProps = {
    /** Tab elements defining labels and panel content. */
    children?: ReactNode;
    gap?: 0 | 0.5 | 1 | 1.5 | 2 | 3 | 4 | 5 | 6 | 8 | 10;
    hasDivider?: boolean;
    /** Receives the selected Tab value; use with value to control selection. */
    onChange?: (value: string) => void;
    /** Selected Tab value; omit for internal selection, initially choosing the first tab. */
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
    const panelId = `${instance}-${activeTab.props.value}`;

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
                    return <AstryxTab {...tabProps} key={tab.props.value} panelId={`${instance}-${tab.props.value}`} />;
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
