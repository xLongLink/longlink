import { ProgressBar as AstryxProgressBar } from '@/components/astryx/ProgressBar';

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
    // Default to visible, determinate progress on a percentage scale.
    return (
        <AstryxProgressBar
            {...props}
            value={props.value ?? 0}
            max={props.max ?? 100}
            isLabelHidden={props.isLabelHidden ?? false}
            hasValueLabel={props.hasValueLabel ?? false}
            variant={props.variant ?? 'accent'}
            isIndeterminate={props.isIndeterminate ?? false}
        />
    );
}
