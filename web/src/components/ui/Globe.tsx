import { z } from 'zod';
import geography from '@/lib/globe.json';
import { Stack } from '@astryxdesign/core/Stack';
import { geoDistance, geoOrthographic } from 'd3-geo';
import { useId, useMemo, type ReactNode } from 'react';

const configuration = z.object({
    label: z.string().trim().min(1),
    country: z
        .string()
        .regex(/^\d{3}$/)
        .optional(),
    highlightedCountries: z.array(z.string().regex(/^\d{3}$/)).default([]),
    variant: z.enum(['overview', 'focus']).default('overview'),
});

/** Displays an offline dotted globe centered on an ISO 3166-1 numeric country code. */
export function Globe(props: {
    label: string;
    country?: string;
    highlightedCountries?: readonly string[];
    variant?: 'overview' | 'focus';
    children?: ReactNode;
}) {
    const instance = useId().replace(/:/g, '');

    // Reject unknown country identifiers instead of silently highlighting the wrong region.
    const config = configuration.parse(props);
    const selected = geography.countries.find((country) => country.id === config.country);

    if (config.country && !selected) throw new Error(`Unknown globe country: ${config.country}`);

    if (config.highlightedCountries.some((id) => !geography.countries.some((country) => country.id === id))) {
        throw new Error('Globe highlights must identify countries in the bundled map.');
    }

    // Orthographic projection clips the far hemisphere, retaining actual geographic land shapes.
    const longitude = Number(selected?.center[0] ?? 12);
    const latitude = Number(selected?.center[1] ?? 25);
    const focused = config.variant === 'focus';
    const scale = focused ? Math.min(680, Math.max(320, 140 / Math.sin(selected?.radius ?? 0.45))) : 152;

    const dots = useMemo(() => {
        const center: [number, number] = [longitude, latitude];

        const projection = geoOrthographic()
            .rotate([-longitude, -latitude])
            .scale(scale)
            .translate(focused ? [580, 180] : [180, 160]);

        return geography.points.flatMap(([lng, lat, country]) => {
            const location: [number, number] = [Number(lng), Number(lat)];

            if (geoDistance(center, location) >= Math.PI / 2) return [];

            const point = projection(location);

            return point ? [{ x: point[0], y: point[1], country: String(country) }] : [];
        });
    }, [longitude, latitude, scale, focused]);

    const image = (
        <svg
            viewBox={focused ? '0 0 800 400' : '0 0 360 320'}
            preserveAspectRatio={focused ? 'xMaxYMid slice' : 'xMidYMid meet'}
            role="img"
            aria-label={config.label}
            className={
                props.children
                    ? 'pointer-events-none absolute inset-0 h-full w-full max-sm:opacity-20'
                    : 'block max-h-80 w-full'
            }
        >
            <title>{config.label}</title>
            <desc>
                {selected ? `${selected.name} highlighted. ` : ''}
                Dotted world map using Natural Earth public-domain boundaries. Country values are listed alongside the
                globe.
            </desc>
            {focused && (
                <defs>
                    <linearGradient id={`${instance}-fade`}>
                        <stop offset="25%" stopColor="white" stopOpacity="0" />
                        <stop offset="58%" stopColor="white" />
                    </linearGradient>
                    <mask id={`${instance}-mask`}>
                        <rect width="800" height="400" fill={`url(#${instance}-fade)`} />
                    </mask>
                </defs>
            )}
            <g mask={focused ? `url(#${instance}-mask)` : undefined}>
                {dots.map((dot) => (
                    <circle
                        key={`${dot.x}-${dot.y}`}
                        cx={dot.x}
                        cy={dot.y}
                        r={focused ? 1.7 : 0.9}
                        fill={
                            dot.country === config.country || config.highlightedCountries.includes(dot.country)
                                ? 'var(--color-card-subtle-accent)'
                                : 'var(--color-icon-secondary)'
                        }
                        opacity={dot.country === config.country ? 1 : 0.38}
                    />
                ))}
            </g>
        </svg>
    );

    // Foreground content determines the card's height while the map remains a cropped backdrop.
    return props.children ? (
        <Stack gap={0} className="relative isolate overflow-hidden">
            {image}
            <Stack gap={0} className="relative">
                {props.children}
            </Stack>
        </Stack>
    ) : (
        image
    );
}
