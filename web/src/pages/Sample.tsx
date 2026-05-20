import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    Line,
    LineChart,
    Pie,
    PieChart,
    PolarAngleAxis,
    PolarGrid,
    PolarRadiusAxis,
    Radar,
    RadarChart,
    RadialBar,
    RadialBarChart,
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
        color: 'var(--accent)',
    },
    mobile: {
        label: 'Mobile',
        color: 'color-mix(in oklab, var(--accent) 82%, white)',
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
        color: 'var(--accent)',
    },
    retained: {
        label: 'Retained',
        color: 'color-mix(in oklab, var(--accent) 82%, white)',
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
        color: 'var(--accent)',
    },
    social: {
        label: 'Social',
        color: 'color-mix(in oklab, var(--accent) 84%, white)',
    },
    direct: {
        label: 'Direct',
        color: 'color-mix(in oklab, var(--accent) 72%, white)',
    },
} satisfies ChartConfig;

const pieData = [
    { name: 'Starter', value: 38, color: 'var(--accent)' },
    { name: 'Pro', value: 31, color: 'color-mix(in oklab, var(--accent) 82%, white)' },
    { name: 'Scale', value: 19, color: 'color-mix(in oklab, var(--accent) 70%, white)' },
    { name: 'Enterprise', value: 12, color: 'color-mix(in oklab, var(--accent) 60%, white)' },
];

const pieConfig = {
    starter: {
        label: 'Starter',
        color: 'var(--accent)',
    },
    pro: {
        label: 'Pro',
        color: 'color-mix(in oklab, var(--accent) 82%, white)',
    },
    scale: {
        label: 'Scale',
        color: 'color-mix(in oklab, var(--accent) 70%, white)',
    },
    enterprise: {
        label: 'Enterprise',
        color: 'color-mix(in oklab, var(--accent) 60%, white)',
    },
} satisfies ChartConfig;

const radarData = [
    { metric: 'Speed', actual: 82, target: 68 },
    { metric: 'Stability', actual: 74, target: 61 },
    { metric: 'Coverage', actual: 88, target: 72 },
    { metric: 'Latency', actual: 67, target: 54 },
    { metric: 'Adoption', actual: 79, target: 63 },
];

const radarConfig = {
    actual: {
        label: 'Actual',
        color: 'var(--accent)',
    },
    target: {
        label: 'Target',
        color: 'color-mix(in oklab, var(--accent) 82%, white)',
    },
} satisfies ChartConfig;

const radialData = [
    { metric: 'North', segment: 'north', value: 86, color: 'var(--color-north)' },
    { metric: 'East', segment: 'east', value: 74, color: 'var(--color-east)' },
    { metric: 'South', segment: 'south', value: 91, color: 'var(--color-south)' },
    { metric: 'West', segment: 'west', value: 68, color: 'var(--color-west)' },
];

const radialConfig = {
    north: {
        label: 'North',
        color: 'var(--accent)',
    },
    east: {
        label: 'East',
        color: 'color-mix(in oklab, var(--accent) 72%, #22c55e)',
    },
    south: {
        label: 'South',
        color: 'color-mix(in oklab, var(--accent) 72%, #38bdf8)',
    },
    west: {
        label: 'West',
        color: 'color-mix(in oklab, var(--accent) 70%, #f43f5e)',
    },
} satisfies ChartConfig;

/** Renders the sample route as a chart gallery. */
export default function Sample() {
    return (
        <main className="mx-auto w-full max-w-[1400px] px-6 py-10">
            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border-white/10 bg-white/[0.04]">
                    <CardHeader>
                        <CardTitle>Line</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={lineConfig} className="min-h-[300px] w-full">
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
                        <CardTitle>Area</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={areaConfig} className="min-h-[280px] w-full">
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

                <Card className="border-white/10 bg-white/[0.04]">
                    <CardHeader>
                        <CardTitle>Bar</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={barConfig} className="min-h-[280px] w-full">
                            <BarChart data={barData} margin={{ left: 8, right: 12, top: 12 }}>
                                <defs>
                                    <filter id="bar-glow" x="-40%" y="-40%" width="180%" height="180%">
                                        <feGaussianBlur stdDeviation="6" result="blur" />
                                        <feColorMatrix
                                            in="blur"
                                            type="matrix"
                                            values="1 0 0 0 0 0 1 0 0 0 0 0 0 1 0 0 0 0 0.35 0"
                                            result="glow"
                                        />
                                        <feMerge>
                                            <feMergeNode in="glow" />
                                            <feMergeNode in="SourceGraphic" />
                                        </feMerge>
                                    </filter>
                                </defs>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                <XAxis dataKey="region" tickLine={false} axisLine={false} />
                                <YAxis tickLine={false} axisLine={false} />
                                <ChartTooltip content={<ChartTooltipContent indicator="dashed" />} />
                                <ChartLegend content={<ChartLegendContent />} />
                                <Bar
                                    dataKey="search"
                                    stackId="a"
                                    fill="var(--color-search)"
                                    fillOpacity={0.24}
                                    stroke="var(--color-search)"
                                    strokeOpacity={0.45}
                                    strokeWidth={1}
                                    filter="url(#bar-glow)"
                                    radius={[4, 4, 0, 0]}
                                />
                                <Bar
                                    dataKey="social"
                                    stackId="a"
                                    fill="var(--color-social)"
                                    fillOpacity={0.18}
                                    stroke="var(--color-social)"
                                    strokeOpacity={0.4}
                                    strokeWidth={1}
                                    filter="url(#bar-glow)"
                                    radius={[4, 4, 0, 0]}
                                />
                                <Bar
                                    dataKey="direct"
                                    stackId="a"
                                    fill="var(--color-direct)"
                                    fillOpacity={0.12}
                                    stroke="var(--color-direct)"
                                    strokeOpacity={0.35}
                                    strokeWidth={1}
                                    filter="url(#bar-glow)"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                <Card className="border-white/10 bg-white/[0.04]">
                    <CardHeader>
                        <CardTitle>Pie</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={pieConfig} className="min-h-[280px] w-full">
                            <PieChart>
                                <defs>
                                    <filter id="pie-glow" x="-40%" y="-40%" width="180%" height="180%">
                                        <feGaussianBlur stdDeviation="5" result="blur" />
                                        <feColorMatrix
                                            in="blur"
                                            type="matrix"
                                            values="1 0 0 0 0 0 1 0 0 0 0 0 0 1 0 0 0 0 0.3 0"
                                            result="glow"
                                        />
                                        <feMerge>
                                            <feMergeNode in="glow" />
                                            <feMergeNode in="SourceGraphic" />
                                        </feMerge>
                                    </filter>
                                </defs>
                                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                                <ChartLegend content={<ChartLegendContent className="pt-2" />} />
                                <Pie
                                    data={pieData}
                                    dataKey="value"
                                    nameKey="name"
                                    innerRadius={64}
                                    outerRadius={104}
                                    paddingAngle={4}
                                    stroke="var(--background)"
                                    strokeOpacity={0.16}
                                    strokeWidth={2}
                                    filter="url(#pie-glow)"
                                >
                                    {pieData.map((entry) => (
                                        <Cell key={entry.name} fill={entry.color} fillOpacity={0.82} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                <Card className="border-white/10 bg-white/[0.04]">
                    <CardHeader>
                        <CardTitle>Radar</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={radarConfig} className="min-h-[280px] w-full">
                            <RadarChart data={radarData} outerRadius="70%">
                                <PolarGrid strokeDasharray="3 3" />
                                <PolarAngleAxis dataKey="metric" tickLine={false} axisLine={false} />
                                <PolarRadiusAxis angle={30} tickLine={false} axisLine={false} domain={[0, 100]} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <ChartLegend content={<ChartLegendContent />} />
                                <Radar
                                    dataKey="actual"
                                    stroke="var(--color-actual)"
                                    fill="var(--color-actual)"
                                    fillOpacity={0.18}
                                />
                                <Radar
                                    dataKey="target"
                                    stroke="var(--color-target)"
                                    fill="var(--color-target)"
                                    fillOpacity={0.1}
                                />
                            </RadarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                <Card className="border-white/10 bg-white/[0.04]">
                    <CardHeader>
                        <CardTitle>Radial</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={radialConfig} className="min-h-[320px] w-full">
                            <RadialBarChart
                                data={radialData}
                                innerRadius="28%"
                                outerRadius="88%"
                                startAngle={90}
                                endAngle={-270}
                            >
                                <defs>
                                    <filter id="radial-glow" x="-40%" y="-40%" width="180%" height="180%">
                                        <feGaussianBlur stdDeviation="5" result="blur" />
                                        <feColorMatrix
                                            in="blur"
                                            type="matrix"
                                            values="1 0 0 0 0 0 1 0 0 0 0 0 0 1 0 0 0 0 0.3 0"
                                            result="glow"
                                        />
                                        <feMerge>
                                            <feMergeNode in="glow" />
                                            <feMergeNode in="SourceGraphic" />
                                        </feMerge>
                                    </filter>
                                </defs>
                                <PolarGrid gridType="circle" radialLines={false} strokeDasharray="3 3" />
                                <PolarAngleAxis type="number" dataKey="value" domain={[0, 100]} tick={false} />
                                <PolarRadiusAxis
                                    type="category"
                                    dataKey="metric"
                                    tick={false}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <ChartTooltip content={<ChartTooltipContent nameKey="segment" />} />
                                <ChartLegend content={<ChartLegendContent nameKey="segment" />} />
                                <RadialBar
                                    dataKey="value"
                                    barSize={18}
                                    background
                                    cornerRadius={10}
                                    fillOpacity={0.85}
                                    filter="url(#radial-glow)"
                                >
                                    {radialData.map((entry) => (
                                        <Cell key={entry.metric} fill={entry.color} />
                                    ))}
                                </RadialBar>
                            </RadialBarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
