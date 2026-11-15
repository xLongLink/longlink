import * as recharts from 'recharts';
import { viewComponent } from '../props';
import * as chart from '@/components/shadcn/chart';

export const AreaChart = viewComponent(recharts.AreaChart);

export const Area = viewComponent(recharts.Area);

export const BarChart = viewComponent(recharts.BarChart);

export const Bar = viewComponent(recharts.Bar);

export const LineChart = viewComponent(recharts.LineChart);

export const Line = viewComponent(recharts.Line);

export const PieChart = viewComponent(recharts.PieChart);

export const Pie = viewComponent(recharts.Pie);

export const Cell = viewComponent(recharts.Cell);

export const RadarChart = viewComponent(recharts.RadarChart);

export const Radar = viewComponent(recharts.Radar);

export const RadialBarChart = viewComponent(recharts.RadialBarChart);

export const RadialBar = viewComponent(recharts.RadialBar);

export const Sankey = viewComponent(recharts.Sankey);

export const CartesianGrid = viewComponent(recharts.CartesianGrid);

export const XAxis = viewComponent(recharts.XAxis);

export const YAxis = viewComponent(recharts.YAxis);

export const PolarGrid = viewComponent(recharts.PolarGrid);

export const PolarAngleAxis = viewComponent(recharts.PolarAngleAxis);

export const PolarRadiusAxis = viewComponent(recharts.PolarRadiusAxis);

export const ResponsiveContainer = viewComponent(recharts.ResponsiveContainer);

export const Label = viewComponent(recharts.Label);

export const LabelList = viewComponent(recharts.LabelList);

export const ReferenceLine = viewComponent(recharts.ReferenceLine);

export const ComposedChart = viewComponent(recharts.ComposedChart);

export const ChartContainer = viewComponent(chart.ChartContainer);

export const ChartTooltip = viewComponent(chart.ChartTooltip);

export const ChartTooltipContent = viewComponent(chart.ChartTooltipContent);

export const ChartLegend = viewComponent(chart.ChartLegend);

export const ChartLegendContent = viewComponent(chart.ChartLegendContent);

export type { ChartConfig } from '@/components/shadcn/chart';
