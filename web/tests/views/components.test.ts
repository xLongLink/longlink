import { it, expect } from 'vitest';
import * as recharts from 'recharts';
import * as card from '@/components/shadcn/card';
import * as components from '@/views/components';
import * as chart from '@/components/shadcn/chart';
import { InteractiveCard } from '@/components/custom/interactive-card';

it('exposes native card composition separately from LongLink surface interactions', () => {
    expect(components.Card).toBe(card.Card);
    expect(components.CardHeader).toBe(card.CardHeader);
    expect(components.CardTitle).toBe(card.CardTitle);
    expect(components.CardDescription).toBe(card.CardDescription);
    expect(components.CardAction).toBe(card.CardAction);
    expect(components.CardContent).toBe(card.CardContent);
    expect(components.CardFooter).toBe(card.CardFooter);
    expect(components.InteractiveCard).toBe(InteractiveCard);
    expect(components.Card).not.toBe(components.InteractiveCard);
});

it('exposes the authored View API without privileged host providers', () => {
    // Assert
    expect(components).toHaveProperty('Form');
    expect(components).toHaveProperty('Stack');
    expect(Object.hasOwn(components, 'Root')).toBe(false);
    expect(Object.hasOwn(components, 'FileRequestContext')).toBe(false);
    expect(Object.hasOwn(components, 'FormRequestContext')).toBe(false);
});

it('exposes native chart components without a LongLink data adapter', () => {
    // Preserve the native component identities required by Recharts composition.
    for (const name of [
        'AreaChart',
        'Area',
        'BarChart',
        'Bar',
        'LineChart',
        'Line',
        'PieChart',
        'Pie',
        'RadarChart',
        'Radar',
        'RadialBarChart',
        'RadialBar',
        'Sankey',
        'XAxis',
        'YAxis'
    ] as const) {
        expect(components[name]).toBe(recharts[name]);
    }

    for (const name of [
        'ChartContainer',
        'ChartTooltip',
        'ChartTooltipContent',
        'ChartLegend',
        'ChartLegendContent'
    ] as const) {
        expect(components[name]).toBe(chart[name]);
    }
});
