import { cn } from 'cn';
import { z } from 'zod';
import * as React from 'react';
import * as RechartsPrimitive from 'recharts';
import type { TooltipValueType } from 'recharts';

const INITIAL_DIMENSION = { width: 320, height: 200 } as const;

type TooltipNameType = number | string;

type ChartPayload =
    | NonNullable<RechartsPrimitive.DefaultTooltipContentProps<TooltipValueType, TooltipNameType>['payload']>[number]
    | NonNullable<RechartsPrimitive.DefaultLegendContentProps['payload']>[number];

export type ChartConfig = Record<
    string,
    {
        label?: React.ReactNode;
        icon?: React.ComponentType;
    } & ({ color?: string; theme?: never } | { color?: never; theme: Record<'light' | 'dark', string> })
>;

type ChartContextProps = {
    config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
    const context = React.useContext(ChartContext);

    if (!context) {
        throw new Error('useChart must be used within a <ChartContainer />');
    }

    return context;
}

function ChartContainer({
    id,
    className,
    children,
    config,
    initialDimension = INITIAL_DIMENSION,
    ...props
}: React.ComponentProps<'div'> & {
    config: ChartConfig;
    children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>['children'];
    initialDimension?: {
        width: number;
        height: number;
    };
}) {
    const uniqueId = React.useId();
    const chartId = `chart-${id ?? uniqueId.replace(/:/g, '')}`;

    return (
        <ChartContext.Provider value={{ config }}>
            <div
                data-slot="chart"
                data-chart={chartId}
                className={cn(
                    "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface:focus-visible]:outline-2 [&_.recharts-surface:focus-visible]:outline-ring",
                    className
                )}
                {...props}
            >
                <ChartStyle id={chartId} config={config} />
                <RechartsPrimitive.ResponsiveContainer initialDimension={initialDimension}>
                    {children}
                </RechartsPrimitive.ResponsiveContainer>
            </div>
        </ChartContext.Provider>
    );
}

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
    const colorConfig = Object.entries(config).filter(([, config]) => config.theme ?? config.color);

    if (!colorConfig.length) {
        return null;
    }

    return (
        <style>
            {`
[data-chart="${id}"] {
${colorConfig
    .map(([key, itemConfig]) => {
        const color =
            (itemConfig.theme ? `light-dark(${itemConfig.theme.light}, ${itemConfig.theme.dark})` : undefined) ??
            itemConfig.color;

        return color ? `  --color-${key}: ${color};` : null;
    })
    .join('\n')}
}
`}
        </style>
    );
};

const ChartTooltip = RechartsPrimitive.Tooltip;

function ChartTooltipContent({
    active,
    payload,
    className,
    indicator = 'dot',
    hideLabel = false,
    hideIndicator = false,
    label,
    labelFormatter,
    labelClassName,
    formatter,
    color,
    nameKey,
    labelKey,
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
    React.ComponentProps<'div'> & {
        hideLabel?: boolean;
        hideIndicator?: boolean;
        indicator?: 'line' | 'dot' | 'dashed';
        nameKey?: string;
        labelKey?: string;
    } & Omit<RechartsPrimitive.DefaultTooltipContentProps<TooltipValueType, TooltipNameType>, 'accessibilityLayer'>) {
    const { config } = useChart();

    const tooltipLabel = React.useMemo(() => {
        if (hideLabel || !payload?.length) {
            return null;
        }

        const [item] = payload;
        const key = String(labelKey ?? item?.dataKey ?? item?.name ?? 'value');
        const itemConfig = getPayloadConfigFromPayload(config, item, key);

        const value =
            !labelKey && z.string().safeParse(label).success
                ? (config[String(label)]?.label ?? label)
                : itemConfig?.label;

        if (labelFormatter) {
            return <div className={cn('font-medium', labelClassName)}>{labelFormatter(value, payload)}</div>;
        }

        if (!value) {
            return null;
        }

        return <div className={cn('font-medium', labelClassName)}>{value}</div>;
    }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey]);

    if (!active || !payload?.length) {
        return null;
    }

    const nestLabel = payload.length === 1 && indicator !== 'dot';

    return (
        <div
            className={cn(
                'grid min-w-32 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl',
                className
            )}
        >
            {!nestLabel ? tooltipLabel : null}
            <div className="grid gap-1.5">
                {payload
                    .filter((item) => item.type !== 'none')
                    .map((item, index) => {
                        const key = String(nameKey ?? item.name ?? item.dataKey ?? 'value');
                        const itemConfig = getPayloadConfigFromPayload(config, item, key);
                        const indicatorColor = color ?? item.color;

                        return (
                            <div
                                key={`${key}:${String(item.name)}`}
                                className={cn(
                                    'flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground',
                                    indicator === 'dot' && 'items-center'
                                )}
                            >
                                {formatter && item?.value !== undefined && item.name ? (
                                    formatter(item.value, item.name, item, index, item.payload)
                                ) : (
                                    <>
                                        {itemConfig?.icon ? (
                                            <itemConfig.icon />
                                        ) : (
                                            !hideIndicator && (
                                                <div
                                                    className={cn(
                                                        'shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)',
                                                        {
                                                            'h-2.5 w-2.5': indicator === 'dot',
                                                            'w-1': indicator === 'line',
                                                            'w-0 border-[1.5px] border-dashed bg-transparent':
                                                                indicator === 'dashed',
                                                            'my-0.5': nestLabel && indicator === 'dashed',
                                                        }
                                                    )}
                                                    style={{
                                                        backgroundColor: indicatorColor,
                                                        borderColor: indicatorColor,
                                                    }}
                                                />
                                            )
                                        )}
                                        <div
                                            className={cn(
                                                'flex flex-1 justify-between leading-none',
                                                nestLabel ? 'items-end' : 'items-center'
                                            )}
                                        >
                                            <div className="grid gap-1.5">
                                                {nestLabel ? tooltipLabel : null}
                                                <span className="text-muted-foreground">
                                                    {itemConfig?.label ?? item.name}
                                                </span>
                                            </div>
                                            {item.value != null && (
                                                <span className="font-mono font-medium text-foreground tabular-nums">
                                                    {item.value.toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
            </div>
        </div>
    );
}

const ChartLegend = RechartsPrimitive.Legend;

function ChartLegendContent({
    className,
    hideIcon = false,
    payload,
    verticalAlign = 'bottom',
    nameKey,
}: React.ComponentProps<'div'> & {
    hideIcon?: boolean;
    nameKey?: string;
} & RechartsPrimitive.DefaultLegendContentProps) {
    const { config } = useChart();

    if (!payload?.length) {
        return null;
    }

    return (
        <div
            className={cn(
                'flex items-center justify-center gap-4',
                verticalAlign === 'top' ? 'pb-3' : 'pt-3',
                className
            )}
        >
            {payload
                .filter((item) => item.type !== 'none')
                .map((item) => {
                    const key = String(nameKey ?? item.dataKey ?? 'value');
                    const itemConfig = getPayloadConfigFromPayload(config, item, key);

                    return (
                        <div
                            key={`${key}:${String(item.value)}`}
                            className={cn(
                                'flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground'
                            )}
                        >
                            {itemConfig?.icon && !hideIcon ? (
                                <itemConfig.icon />
                            ) : (
                                <div
                                    className="h-2 w-2 shrink-0 rounded-[2px]"
                                    style={{
                                        backgroundColor: item.color,
                                    }}
                                />
                            )}
                            {itemConfig?.label}
                        </div>
                    );
                })}
        </div>
    );
}

function getPayloadConfigFromPayload(config: ChartConfig, payload: ChartPayload | undefined, key: string) {
    const parsed = z.record(z.string(), z.unknown()).safeParse(payload);

    if (!parsed.success) return config[key];
    const nested = z.record(z.string(), z.unknown()).safeParse(parsed.data.payload);
    const name = z.string().safeParse(parsed.data[key]);
    const nestedName = z.string().safeParse(nested.data?.[key]);
    const configKey = name.data ?? nestedName.data ?? key;

    return config[configKey] ?? config[key];
}

export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, ChartStyle };
