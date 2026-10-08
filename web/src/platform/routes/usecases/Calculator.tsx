import { z } from 'zod';
import { useState } from 'react';
import { Info } from 'lucide-react';
import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Icon } from '@astryxdesign/core/Icon';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Slider } from '@astryxdesign/core/Slider';
import { Heading } from '@astryxdesign/core/Heading';
import { Popover } from '@astryxdesign/core/Popover';
import { IconButton } from '@astryxdesign/core/IconButton';

// Space property counts progressively while retaining small volumes and the existing default.
const propertyCounts = [0, 1, 4, 9, 16, 25, 50, 100, 200, 350, 550, 800, 1100, 1500, 2000];

// Validate actual input values against the allowed counts and control increments.
const assumptions = z.object({
    properties: z
        .number()
        .int()
        .min(0)
        .max(2000)
        .refine((value) => propertyCounts.includes(value)),
    minutes: z.number().min(0).max(120).multipleOf(15),
    hourlyCost: z.number().int().min(0).max(500).multipleOf(25),
});

// Keep units visible and use the same field layout for each editable assumption.
const fields = [
    {
        key: 'properties',
        label: 'Properties screened monthly',
        max: propertyCounts.length - 1,
        step: 1,
        suffix: '',
    },
    { key: 'minutes', label: 'Manual screening time per property', max: 120, step: 15, suffix: ' min' },
    { key: 'hourlyCost', label: 'Hourly labor cost', max: 500, step: 25, suffix: ' CHF/h' },
] as const;

/** Estimates screening time and its cost value from editable, illustrative assumptions. */
export default function Calculator() {
    // Start with modest illustrative inputs, not customer benchmarks; derive results from editable assumptions.
    const [inputs, setInputs] = useState({ properties: 50, minutes: 30, hourlyCost: 75 });
    const annualHours = ((inputs.properties * inputs.minutes) / 60) * 12;

    // Translate the saved hours into their illustrative labor-cost value.
    const annualSavings = annualHours * inputs.hourlyCost;

    // Keep the calculator in normal content flow so narrow or short screens can scroll naturally.
    return (
        <Card padding={6} variant="muted" className="relative" aria-labelledby="screening-calculator-title">
            <Grid columns={{ minWidth: 280, max: 2, repeat: 'fit' }} gap={8} align="center">
                <Stack gap={4}>
                    <Heading
                        level={2}
                        id="screening-calculator-title"
                        className="font-(family-name:--font-family-handwritten)"
                    >
                        Estimate potential savings
                    </Heading>
                    <Stack gap={6}>
                        {fields.map(({ key, label, max, step, suffix }) => (
                            <Stack key={key} gap={0}>
                                <Stack direction="horizontal" gap={2} justify="between" align="start">
                                    <Text type="label" color="secondary">
                                        {label}
                                    </Text>
                                    <Text color="secondary" weight="semibold" justify="end" textWrap="nowrap">
                                        {inputs[key].toLocaleString('en-US')}
                                        {suffix}
                                    </Text>
                                </Stack>
                                <Slider
                                    label={label}
                                    isLabelHidden
                                    value={
                                        key === 'properties' ? propertyCounts.indexOf(inputs.properties) : inputs[key]
                                    }
                                    min={0}
                                    max={max}
                                    step={step}
                                    valueDisplay="none"
                                    formatValue={(value) =>
                                        `${(key === 'properties' ? propertyCounts[value] : value).toLocaleString('en-US')}${suffix}`
                                    }
                                    onChange={(value: number) => {
                                        // Map slider positions to actual counts before validating and calculating results.
                                        setInputs((current) => {
                                            const validation = assumptions.safeParse({
                                                ...current,
                                                [key]: key === 'properties' ? propertyCounts[value] : value,
                                            });

                                            return validation.success ? validation.data : current;
                                        });
                                    }}
                                    width="100%"
                                />
                            </Stack>
                        ))}
                    </Stack>
                </Stack>
                <Stack>
                    <Stack className="absolute top-2 end-2">
                        <Popover
                            label="How savings are estimated"
                            className="border border-border-strong shadow-lg"
                            alignment="end"
                            padding={4}
                            content={
                                <Stack gap={3} className="max-w-80">
                                    <Text weight="semibold">How savings are estimated</Text>
                                    <Text as="p" textWrap="pretty">
                                        Annual hours saved = Properties per month × 12 × Manual minutes per property ÷
                                        60 × Estimated time reduction
                                    </Text>
                                    <Text as="p" textWrap="pretty">
                                        Annual labor savings = Annual hours saved × Hourly labor cost
                                    </Text>
                                    <Text as="p" type="supporting" textWrap="pretty">
                                        The current estimate assumes a 100% reduction in manual screening time. It
                                        excludes implementation and ongoing costs.
                                    </Text>
                                </Stack>
                            }
                        >
                            <IconButton
                                label="How savings are estimated"
                                icon={<Icon icon={Info} color="secondary" />}
                                variant="ghost"
                                size="sm"
                            />
                        </Popover>
                    </Stack>
                    <Stack gap={6} align="center" justify="center" aria-live="polite" aria-atomic="true">
                        <Stack gap={2} align="center">
                            <Text type="supporting" justify="center">
                                Potential annual labor value
                            </Text>
                            <Text size="3xl" weight="semibold" justify="center" hasTabularNumbers>
                                {annualSavings.toLocaleString('en-US', {
                                    style: 'currency',
                                    currency: 'CHF',
                                    currencyDisplay: 'code',
                                    maximumFractionDigits: 0,
                                })}
                            </Text>
                        </Stack>
                        <Stack gap={1} align="center">
                            <Text type="supporting" justify="center">
                                Estimated hours saved annually
                            </Text>
                            <Text weight="semibold" justify="center" hasTabularNumbers>
                                {annualHours.toLocaleString('en-US', { maximumFractionDigits: 1 })} h
                            </Text>
                        </Stack>
                    </Stack>
                </Stack>
            </Grid>
        </Card>
    );
}
