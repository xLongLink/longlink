import * as tabs from '@/components/shadcn/tabs';
import { Spinner } from '@/components/shadcn/spinner';
import { Suspense, type ComponentProps, type ReactNode } from 'react';

type TabItem = { value: string; label: ReactNode; content?: ReactNode; disabled?: boolean; keepMounted?: boolean };

/** Builds a native tab list and matching panels from typed items. */
export function Tabs({
    items,
    defaultValue,
    variant,
    onValueChange,
    ...props
}: Omit<
    ComponentProps<typeof tabs.Tabs>,
    'children' | 'className' | 'style' | 'value' | 'defaultValue' | 'onValueChange' | 'orientation'
> &
    Pick<ComponentProps<typeof tabs.TabsList>, 'variant'> & {
        items: readonly TabItem[];
        value?: string;
        defaultValue?: string;
        onValueChange?: (value: string) => void;
    }) {
    return (
        <tabs.Tabs
            {...props}
            orientation="horizontal"
            defaultValue={defaultValue === undefined ? items.find((item) => !item.disabled)?.value : defaultValue}
            onValueChange={(value) => onValueChange?.(value)}
            className={undefined}
            style={undefined}
        >
            <tabs.TabsList variant={variant} aria-label={props['aria-label']}>
                {items.map((item) => (
                    <tabs.TabsTrigger
                        key={item.value}
                        value={item.value}
                        disabled={item.disabled}
                        className="not-disabled:not-data-disabled:cursor-pointer"
                    >
                        {item.label}
                    </tabs.TabsTrigger>
                ))}
            </tabs.TabsList>
            {items.map((item) => (
                <tabs.TabsContent key={item.value} value={item.value} keepMounted={item.keepMounted}>
                    <Suspense
                        fallback={
                            <div className="grid min-h-24 place-items-center">
                                <Spinner
                                    role="status"
                                    aria-label="Loading tab content"
                                    className="motion-reduce:animate-none"
                                />
                            </div>
                        }
                    >
                        {item.content}
                    </Suspense>
                </tabs.TabsContent>
            ))}
        </tabs.Tabs>
    );
}
