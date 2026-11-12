import { cn } from 'cn';
import type { CSSProperties } from 'react';
import { Tooltip } from '@base-ui/react/tooltip';
import { useId, useRef, useState, useEffect } from 'react';
import { Progress, ProgressTrack, ProgressIndicator } from '@/components/shadcn/progress';

/** Displays determinate or indeterminate progress with a semantic state. */
export function ProgressBar(props: {
    label: string;
    value?: number;
    max?: number;
    hasValueLabel?: boolean;
    /** Formats usage counts or units instead of the default percentage. */
    formatValueLabel?: (value: number, max: number) => string;
    variant?: 'accent' | 'success' | 'warning' | 'error' | 'neutral';
    marks?: ReadonlyArray<{ value: number; label: string }>;
    isDisabled?: boolean;
    isLabelHidden?: boolean;
    isIndeterminate?: boolean;
}) {
    // Keep invalid input and custom value labels consistent with the existing View API.
    const labelId = useId();
    const value = Number.isFinite(props.value ?? 0) ? (props.value ?? 0) : 0;
    const max = Number.isFinite(props.max ?? 100) ? (props.max ?? 100) : 0;
    const clampedValue = Math.min(Math.max(0, value), max);
    const percentage = max > 0 ? (clampedValue / max) * 100 : 0;
    const valueText = props.formatValueLabel?.(clampedValue, max) ?? `${Math.round(percentage)}%`;
    const showValueLabel = props.hasValueLabel && !props.isIndeterminate;
    const variant = props.isDisabled ? 'disabled' : (props.variant ?? 'accent');

    const fillColor =
        variant === 'neutral' || variant === 'disabled' ? 'var(--color-text-disabled)' : `var(--color-${variant})`;

    // Track touch geometry so marks reflect the minimum sixteen-pixel fill.
    const trackRef = useRef<HTMLDivElement>(null);
    const [trackWidth, setTrackWidth] = useState(0);
    const [isTouch, setIsTouch] = useState(false);
    useEffect(() => {
        const query = window.matchMedia('(pointer: coarse)');
        const updateTouch = () => setIsTouch(query.matches);
        updateTouch();
        query.addEventListener('change', updateTouch);

        return () => query.removeEventListener('change', updateTouch);
    }, []);
    useEffect(() => {
        const track = trackRef.current;

        if (!track || !isTouch || !props.marks?.length || props.isIndeterminate) return;

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];

            if (entry) setTrackWidth(entry.contentRect.width);
        });

        setTrackWidth(track.getBoundingClientRect().width);
        observer.observe(track);

        return () => observer.disconnect();
    }, [isTouch, props.marks?.length, props.isIndeterminate]);

    const drawnPercentage =
        isTouch && trackWidth > 0 && percentage > 0 ? Math.max(percentage, (16 / trackWidth) * 100) : percentage;

    // Preserve distance-based touch timing, including a reversal during an active transition.
    const [motion, setMotion] = useState({ percentage, change: 0, flip: 0 });
    const changed = motion.percentage !== percentage;
    const change = changed ? Math.abs(percentage - motion.percentage) / 100 : motion.change;
    const flip = changed ? (motion.flip + 1) % 3 : motion.flip;

    if (changed) setMotion({ percentage, change, flip });

    const fillStyle: CSSProperties & {
        '--progress-fill': string;
        '--progress-move': string;
        '--progress-flip': number;
    } = {
        width: props.isIndeterminate ? undefined : '100%',
        backgroundColor: fillColor,
        '--progress-fill': `${percentage}%`,
        '--progress-move': `${change * 1000}ms`,
        '--progress-flip': flip,
    };

    return (
        <section className="flex min-w-12 w-full flex-col gap-(--spacing-1)">
            <header
                className={cn(
                    'flex items-baseline justify-between',
                    props.isLabelHidden && !showValueLabel && 'sr-only'
                )}
            >
                <p
                    id={labelId}
                    className={cn(
                        'text-(length:--text-body-size) leading-(--text-body-leading) font-medium',
                        props.isLabelHidden && 'sr-only',
                        props.isDisabled ? 'text-(--color-text-disabled)' : 'text-(--color-text-primary)'
                    )}
                >
                    {props.label}
                </p>
                {showValueLabel && (
                    <p
                        className={cn(
                            'text-(length:--text-body-size) leading-(--text-body-leading)',
                            props.isDisabled ? 'text-(--color-text-disabled)' : 'text-(--color-text-secondary)'
                        )}
                    >
                        {valueText}
                    </p>
                )}
            </header>
            <section className="relative w-full">
                <Progress
                    ref={trackRef}
                    value={props.isIndeterminate ? null : clampedValue}
                    max={max}
                    aria-labelledby={labelId}
                    aria-valuenow={props.isIndeterminate ? undefined : clampedValue}
                    aria-valuemin={props.isIndeterminate ? undefined : 0}
                    aria-valuemax={props.isIndeterminate ? undefined : max}
                    aria-valuetext={props.isIndeterminate ? undefined : valueText}
                >
                    <ProgressTrack>
                        <ProgressIndicator
                            className="longlink-progress-fill"
                            data-indeterminate={props.isIndeterminate || undefined}
                            data-empty={percentage === 0 || undefined}
                            style={fillStyle}
                        />
                    </ProgressTrack>
                </Progress>
                {!props.isIndeterminate &&
                    props.marks?.map((mark) => {
                        if (!Number.isFinite(mark.value)) return null;
                        const position = max > 0 ? (Math.min(Math.max(0, mark.value), max) / max) * 100 : 0;
                        const onFill = percentage > 0 && position <= drawnPercentage;

                        const color = props.isDisabled
                            ? 'var(--color-text-secondary)'
                            : !onFill || variant === 'neutral'
                              ? 'var(--color-text-primary)'
                              : `var(--color-on-${variant})`;

                        return (
                            <ProgressMark
                                key={`${mark.value}:${mark.label}`}
                                label={mark.label}
                                position={position}
                                color={color}
                                onFill={onFill}
                            />
                        );
                    })}
            </section>
        </section>
    );
}

function ProgressMark({
    label,
    position,
    color,
    onFill,
}: {
    label: string;
    position: number;
    color: string;
    onFill: boolean;
}) {
    const triggerId = useId();
    const [open, setOpen] = useState(false);
    const tooltipContainer = useRef<HTMLElement>(null);

    return (
        <Tooltip.Provider delay={200}>
            <Tooltip.Root open={open} onOpenChange={setOpen} triggerId={triggerId}>
                <Tooltip.Trigger
                    id={triggerId}
                    ref={(element: HTMLElement | null) => {
                        tooltipContainer.current = element?.closest<HTMLElement>('[data-astryx-theme]') ?? null;
                    }}
                    render={<span role="img" tabIndex={0} />}
                    aria-label={label}
                    aria-describedby={open ? `${triggerId}-tooltip` : undefined}
                    closeOnClick={false}
                    onFocus={() => setOpen(true)}
                    className="absolute top-1/2 h-2 w-0.5 -translate-x-1/2 -translate-y-1/2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent) rtl:translate-x-1/2"
                    style={{ insetInlineStart: `${position}%`, backgroundColor: color }}
                    data-placement={onFill ? 'fill' : 'track'}
                />
                <Tooltip.Portal container={tooltipContainer}>
                    <Tooltip.Positioner side="top" sideOffset={4}>
                        <Tooltip.Popup
                            id={`${triggerId}-tooltip`}
                            role="tooltip"
                            className="max-w-[300px] rounded-(--radius-container) bg-(--color-text-primary) px-(--spacing-2) py-(--spacing-1) text-(length:--text-body-size) leading-(--text-body-leading) wrap-break-word text-(--color-background-surface)"
                        >
                            {label}
                        </Tooltip.Popup>
                    </Tooltip.Positioner>
                </Tooltip.Portal>
            </Tooltip.Root>
        </Tooltip.Provider>
    );
}
