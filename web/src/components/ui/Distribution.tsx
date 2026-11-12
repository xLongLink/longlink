import { z } from 'zod';
import { Stack } from '@astryxdesign/core/Stack';

const configuration = z.object({
    label: z.string().trim().min(1),
    segments: z
        .array(
            z.object({
                label: z.string().trim().min(1),
                value: z.number().nonnegative(),
                color: z
                    .enum(['accent', 'success', 'neutral', 'blue', 'purple', 'green', 'orange', 'pink'])
                    .default('accent'),
            })
        )
        .refine(
            (segments) => new Set(segments.map((segment) => segment.label)).size === segments.length,
            'Distribution segment labels must be unique.'
        ),
});

const colors = {
    accent: 'bg-accent',
    success: 'bg-success',
    neutral: 'bg-(--color-icon-secondary)',
    blue: 'bg-(--color-series-blue)',
    purple: 'bg-(--color-series-purple)',
    green: 'bg-(--color-series-green)',
    orange: 'bg-(--color-series-orange)',
    pink: 'bg-(--color-series-pink)',
};

/** Shows non-negative parts of a whole as a compact, theme-colored strip. */
export function Distribution(props: {
    label: string;
    segments: readonly {
        label: string;
        value: number;
        color?: 'accent' | 'success' | 'neutral' | 'blue' | 'purple' | 'green' | 'orange' | 'pink';
    }[];
}) {
    const config = configuration.parse(props);

    // Zero-valued parts take no visual space and must never become artificial observations.
    const segments = config.segments.filter((segment) => segment.value > 0);
    const total = segments.reduce((sum, segment) => sum + segment.value, 0);

    if (!Number.isFinite(total)) throw new Error('Distribution total must be finite.');

    const description =
        total > 0 ? config.segments.map((segment) => `${segment.label}: ${segment.value}`).join('; ') : 'No data';

    // Native Stack sizing keeps the strip responsive without custom View styles.
    return (
        <Stack
            direction="horizontal"
            gap={0.5}
            role="img"
            aria-label={`${config.label}: ${description}`}
            className="h-2 rounded-full bg-muted"
        >
            {segments.map((segment) => (
                <Stack
                    key={segment.label}
                    width={`${(segment.value / total) * 100}%`}
                    className={`h-full rounded-full ${colors[segment.color]}`}
                />
            ))}
        </Stack>
    );
}
