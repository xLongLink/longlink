import type { ChartOptions } from './types';
import type { ComponentProps } from 'react';
import { ChartContainer, type ChartConfig } from '@/components/shadcn/chart';

/** Keeps chart sizing, accessible naming, and unavailable data local to the chart region. */
export function ChartFrame({
    config,
    label,
    empty,
    error,
    children,
    ...props
}: Omit<ChartOptions, 'legend' | 'tooltip'> & {
    config: ChartConfig;
    label: string;
    empty?: boolean;
    error?: string;
    children: ComponentProps<typeof ChartContainer>['children'];
}) {
    return (
        <div role="group" aria-label={label} {...props} data-slot="chart-root" className="h-full min-w-0 w-full">
            {error || empty ? (
                <div
                    role={error ? 'alert' : 'status'}
                    className="flex h-full items-center justify-center text-sm text-muted-foreground"
                >
                    {error ?? 'No data'}
                </div>
            ) : (
                <ChartContainer config={config} className="h-full min-w-0 w-full aspect-auto">
                    {children}
                </ChartContainer>
            )}
        </div>
    );
}
