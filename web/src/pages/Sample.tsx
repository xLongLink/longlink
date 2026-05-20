import Layout from '@/Layout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ComposedChart,
    Line,
    LineChart,
    Pie,
    PieChart,
    ReferenceLine,
    XAxis,
    YAxis,
} from 'recharts';

const lineData = [
    { month: 'Jan', web: 42, mobile: 24 },
    { month: 'Feb', web: 58, mobile: 31 },
    { month: 'Mar', web: 66, mobile: 38 },
    { month: 'Apr', web: 73, mobile: 45 },
    { month: 'May', web: 88, mobile: 52 },
    { month: 'Jun', web: 96, mobile: 61 },
];

const lineConfig = {
    web: {
        label: 'Web',
        color: 'var(--chart-1)',
    },
    mobile: {
        label: 'Mobile',
        color: 'var(--chart-2)',
    },
} satisfies ChartConfig;

const areaData = [
    { week: 'W1', activated: 18, retained: 11 },
    { week: 'W2', activated: 24, retained: 15 },
    { week: 'W3', activated: 31, retained: 21 },
    { week: 'W4', activated: 34, retained: 24 },
    { week: 'W5', activated: 42, retained: 29 },
];

const areaConfig = {
    activated: {
        label: 'Activated',
        color: 'var(--chart-1)',
    },
    retained: {
        label: 'Retained',
        color: 'var(--chart-2)',
    },
} satisfies ChartConfig;

const barData = [
    { region: 'NA', search: 34, social: 18, direct: 21 },
    { region: 'EU', search: 29, social: 16, direct: 14 },
    { region: 'APAC', search: 37, social: 22, direct: 19 },
    { region: 'LATAM', search: 23, social: 11, direct: 12 },
];

const barConfig = {
    search: {
        label: 'Search',
        color: 'var(--chart-3)',
    },
    social: {
        label: 'Social',
        color: 'var(--chart-4)',
    },
    direct: {
        label: 'Direct',
        color: 'var(--chart-5)',
    },
} satisfies ChartConfig;

const mixData = [
    { stage: 'Lead', volume: 82, conversion: 21 },
    { stage: 'Qualified', volume: 64, conversion: 26 },
    { stage: 'Proposal', volume: 48, conversion: 31 },
    { stage: 'Won', volume: 29, conversion: 44 },
];

const mixConfig = {
    volume: {
        label: 'Volume',
        color: 'var(--chart-1)',
    },
    conversion: {
        label: 'Conversion %',
        color: 'var(--chart-2)',
    },
} satisfies ChartConfig;

const pieData = [
    { name: 'Starter', value: 38, color: 'var(--chart-1)' },
    { name: 'Pro', value: 31, color: 'var(--chart-2)' },
    { name: 'Scale', value: 19, color: 'var(--chart-3)' },
    { name: 'Enterprise', value: 12, color: 'var(--chart-4)' },
];

const pieConfig = {
    starter: {
        label: 'Starter',
        color: 'var(--chart-1)',
    },
    pro: {
        label: 'Pro',
        color: 'var(--chart-2)',
    },
    scale: {
        label: 'Scale',
        color: 'var(--chart-3)',
    },
    enterprise: {
        label: 'Enterprise',
        color: 'var(--chart-4)',
    },
} satisfies ChartConfig;

const featureItems = [
    'Line, area, bar, pie, and composed charts',
    'Stacking, multiple series, axes, and reference lines',
    'Tooltip, legend, formatter, and custom labels',
    'Theme-aware colors through chartConfig',
    'Works with any Recharts chart primitives',
];

const minimalSnippet = String.raw`import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';

const chartConfig = {
  desktop: { label: 'Desktop', color: 'var(--chart-1)' },
  mobile: { label: 'Mobile', color: 'var(--chart-2)' },
};

export function ExampleChart({ data }) {
  return (
    <ChartContainer config={chartConfig} className='min-h-[240px] w-full'>
      <BarChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey='month' tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey='desktop' fill='var(--color-desktop)' radius={4} />
        <Bar dataKey='mobile' fill='var(--color-mobile)' radius={4} />
      </BarChart>
    </ChartContainer>
  );
}`;

/** Renders a public chart sample and shadcn chart showcase. */
export default function Sample() {
    return (
        <Layout>
            <main className="mx-auto w-full max-w-[1200px] px-6 py-16">
                <section className="space-y-6">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">Sample</Badge>
                        <Badge variant="outline">shadcn/ui chart</Badge>
                    </div>
                    <div className="max-w-3xl space-y-4">
                        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Chart showcase</h1>
                        <p className="text-base leading-7 text-white/70 sm:text-lg">
                            A compact playground for the shadcn chart primitive, with the minimal implementation and a
                            set of examples that cover the main Recharts combinations LongLink can render.
                        </p>
                    </div>
                </section>

                <section className="mt-12 grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
                    <Card className="border-white/10 bg-white/[0.04]">
                        <CardHeader>
                            <CardTitle>Trend view</CardTitle>
                            <CardDescription>Line chart with tooltip, legend, axes, and theme colors.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={lineConfig} className="min-h-[320px] w-full">
                                <LineChart data={lineData} margin={{ left: 8, right: 12, top: 12 }}>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                                    <YAxis tickLine={false} axisLine={false} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <ChartLegend content={<ChartLegendContent />} />
                                    <Line
                                        type="monotone"
                                        dataKey="web"
                                        stroke="var(--color-web)"
                                        strokeWidth={2.5}
                                        dot={false}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="mobile"
                                        stroke="var(--color-mobile)"
                                        strokeWidth={2.5}
                                        dot={false}
                                    />
                                </LineChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>

                    <Card className="border-white/10 bg-white/[0.04]">
                        <CardHeader>
                            <CardTitle>Capabilities</CardTitle>
                            <CardDescription>
                                What the chart primitive can express without extra wrappers.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                {['Line', 'Area', 'Bar', 'Pie', 'Composed', 'Responsive', 'Tooltip', 'Legend'].map(
                                    (item) => (
                                        <Badge key={item} variant="outline">
                                            {item}
                                        </Badge>
                                    )
                                )}
                            </div>
                            <ul className="space-y-3 text-sm leading-6 text-white/70">
                                {featureItems.map((item) => (
                                    <li key={item} className="flex gap-3">
                                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </section>

                <section className="mt-6 grid gap-6">
                    <Card className="border-white/10 bg-white/[0.04]">
                        <CardHeader>
                            <CardTitle>Activation curve</CardTitle>
                            <CardDescription>Area chart for momentum, overlap, and soft transitions.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={areaConfig} className="min-h-[300px] w-full">
                                <AreaChart data={areaData} margin={{ left: 8, right: 12, top: 12 }}>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                    <XAxis dataKey="week" tickLine={false} axisLine={false} />
                                    <YAxis tickLine={false} axisLine={false} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <ChartLegend content={<ChartLegendContent />} />
                                    <Area
                                        type="monotone"
                                        dataKey="activated"
                                        stroke="var(--color-activated)"
                                        fill="var(--color-activated)"
                                        fillOpacity={0.2}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="retained"
                                        stroke="var(--color-retained)"
                                        fill="var(--color-retained)"
                                        fillOpacity={0.2}
                                    />
                                </AreaChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                </section>

                <section className="mt-6 grid gap-6 lg:grid-cols-3">
                    <Card className="border-white/10 bg-white/[0.04] lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Stacked acquisition mix</CardTitle>
                            <CardDescription>
                                Bar chart with multiple series and a reference target line.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={barConfig} className="min-h-[300px] w-full">
                                <BarChart data={barData} margin={{ left: 8, right: 12, top: 12 }}>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                    <XAxis dataKey="region" tickLine={false} axisLine={false} />
                                    <YAxis tickLine={false} axisLine={false} />
                                    <ChartTooltip content={<ChartTooltipContent indicator="dashed" />} />
                                    <ChartLegend content={<ChartLegendContent />} />
                                    <ReferenceLine y={70} stroke="currentColor" strokeDasharray="4 4" />
                                    <Bar
                                        dataKey="search"
                                        stackId="a"
                                        fill="var(--color-search)"
                                        radius={[4, 4, 0, 0]}
                                    />
                                    <Bar
                                        dataKey="social"
                                        stackId="a"
                                        fill="var(--color-social)"
                                        radius={[4, 4, 0, 0]}
                                    />
                                    <Bar
                                        dataKey="direct"
                                        stackId="a"
                                        fill="var(--color-direct)"
                                        radius={[4, 4, 0, 0]}
                                    />
                                </BarChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>

                    <Card className="border-white/10 bg-white/[0.04]">
                        <CardHeader>
                            <CardTitle>Plan split</CardTitle>
                            <CardDescription>Donut chart for composition, mix, and share.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={pieConfig} className="min-h-[300px] w-full">
                                <PieChart>
                                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                                    <ChartLegend content={<ChartLegendContent className="pt-2" />} />
                                    <Pie
                                        data={pieData}
                                        dataKey="value"
                                        nameKey="name"
                                        innerRadius={64}
                                        outerRadius={104}
                                        paddingAngle={4}
                                    >
                                        {pieData.map((entry) => (
                                            <Cell key={entry.name} fill={entry.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                </section>

                <section className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                    <Card className="border-white/10 bg-white/[0.04]">
                        <CardHeader>
                            <CardTitle>Mixed signal</CardTitle>
                            <CardDescription>Composed chart with bars, lines, and a target benchmark.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={mixConfig} className="min-h-[280px] w-full">
                                <ComposedChart data={mixData} margin={{ left: 8, right: 12, top: 12 }}>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                    <XAxis dataKey="stage" tickLine={false} axisLine={false} />
                                    <YAxis tickLine={false} axisLine={false} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <ChartLegend content={<ChartLegendContent />} />
                                    <ReferenceLine y={35} stroke="currentColor" strokeDasharray="5 5" />
                                    <Bar dataKey="volume" fill="var(--color-volume)" radius={4} />
                                    <Line
                                        type="monotone"
                                        dataKey="conversion"
                                        stroke="var(--color-conversion)"
                                        strokeWidth={3}
                                        dot={{ r: 3 }}
                                    />
                                </ComposedChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>

                    <Card className="border-white/10 bg-white/[0.04]">
                        <CardHeader>
                            <CardTitle>Minimal recipe</CardTitle>
                            <CardDescription>
                                The smallest useful shadcn chart implementation, ready to adapt.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <pre className="overflow-x-auto rounded-xl bg-black/30 p-4 text-xs leading-6 text-white/80">
                                <code>{minimalSnippet}</code>
                            </pre>
                        </CardContent>
                    </Card>
                </section>

                <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-accent">Recharts</p>
                            <h2 className="mt-2 text-2xl font-semibold">Everything stays composable.</h2>
                        </div>
                        <p className="max-w-2xl text-sm leading-6 text-white/65">
                            The chart container injects theme colors and leaves the chart primitives open, so you can
                            mix labels, custom tooltips, stacked series, and any other Recharts prop you need.
                        </p>
                    </div>
                </section>
            </main>
        </Layout>
    );
}
