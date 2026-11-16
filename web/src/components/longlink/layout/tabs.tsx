import * as tabs from '@/components/shadcn/tabs';
import { Children, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from 'react';

type TabProps = { value: string; label: ReactNode; children?: ReactNode; disabled?: boolean; keepMounted?: boolean };

/** Builds a native tab list and matching panels from content-owning Tab definitions. */
export function Tabs({
    children,
    defaultValue,
    variant,
    onValueChange,
    ...props
}: Omit<
    ComponentProps<typeof tabs.Tabs>,
    'className' | 'style' | 'value' | 'defaultValue' | 'onValueChange' | 'orientation'
> &
    Pick<ComponentProps<typeof tabs.TabsList>, 'variant'> & {
        value?: string;
        defaultValue?: string;
        onValueChange?: (value: string) => void;
    }) {
    const items = Children.toArray(children).filter(
        (child): child is ReactElement<TabProps> => isValidElement(child) && child.type === Tab
    );

    return (
        <tabs.Tabs
            {...props}
            orientation="horizontal"
            defaultValue={
                defaultValue === undefined ? items.find((item) => !item.props.disabled)?.props.value : defaultValue
            }
            onValueChange={(value) => onValueChange?.(value)}
            className={undefined}
            style={undefined}
        >
            <tabs.TabsList variant={variant} aria-label={props['aria-label']}>
                {items.map((item) => (
                    <tabs.TabsTrigger
                        key={item.props.value}
                        value={item.props.value}
                        disabled={item.props.disabled}
                        className="not-disabled:not-data-disabled:cursor-pointer"
                    >
                        {item.props.label}
                    </tabs.TabsTrigger>
                ))}
            </tabs.TabsList>
            {items.map((item) => (
                <tabs.TabsContent key={item.props.value} value={item.props.value} keepMounted={item.props.keepMounted}>
                    {item.props.children}
                </tabs.TabsContent>
            ))}
        </tabs.Tabs>
    );
}

/** Defines a tab label and its panel without rendering either independently. */
export function Tab(_props: TabProps) {
    return null;
}
