import { cn } from 'cn';
import type { Spacing } from './types';
import { Children, isValidElement, useState, type ReactElement, type ReactNode } from 'react';
import { Tabs as TabRoot, TabsList, TabsTrigger, TabsContent } from '@/components/shadcn/tabs';

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
    gap?: Spacing;
    hasDivider?: boolean;
    /** Receives the selected Tab value; use with value to control selection. */
    onChange?: (value: string) => void;
    /** Selected Tab value; omit for internal selection, initially choosing the first tab. */
    value?: string;
};

/** Renders a tab strip and mounts only the selected Tab's content. */
export function Tabs({ children, gap = 3, hasDivider = false, onChange, value: controlledValue }: TabsProps) {
    const [selection, setSelection] = useState('');

    // Resolve JSX tabs once, falling back to the first tab for missing selections.
    const tabs = Children.toArray(children).filter(
        (child): child is ReactElement<TabProps> => isValidElement(child) && child.type === Tab
    );

    const activeTab = tabs.find((tab) => tab.props.value === (controlledValue ?? selection)) ?? tabs[0];

    if (!activeTab) return null;

    // Link each tab to the one content panel owned by this Tabs instance.
    return (
        <TabRoot
            className="view-tabs"
            style={{ gap: `calc(var(--spacing) * ${gap})` }}
            value={activeTab.props.value}
            onValueChange={(value) => {
                const tab = tabs.find((tab) => tab.props.value === value);

                if (!tab) return;

                if (controlledValue === undefined) setSelection(tab.props.value);
                onChange?.(tab.props.value);
            }}
        >
            <TabsList
                variant="line"
                aria-label="Tabs"
                className={cn('w-full justify-start overflow-x-auto p-0', hasDivider && 'border-b border-border')}
            >
                {tabs.map((tab) => (
                    <TabsTrigger
                        key={tab.props.value}
                        value={tab.props.value}
                        disabled={tab.props.isDisabled}
                        className="min-h-(--size-element-md) flex-none px-3 text-(length:--font-size-base) text-muted-foreground data-active:font-semibold after:bg-primary group-data-[variant=line]/tabs-list:hover:bg-secondary"
                    >
                        {tab.props.label}
                    </TabsTrigger>
                ))}
            </TabsList>
            <TabsContent
                key={activeTab.props.value}
                value={activeTab.props.value}
                aria-label={activeTab.props.label}
                className="flex flex-col"
                style={{ gap: `calc(var(--spacing) * ${gap})` }}
            >
                {activeTab.props.children}
            </TabsContent>
        </TabRoot>
    );
}

/** Defines a tab and the content rendered when it is selected. */
export function Tab(_props: TabProps) {
    return null;
}
