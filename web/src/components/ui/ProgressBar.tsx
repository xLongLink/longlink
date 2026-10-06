import { ProgressBar as AstryxProgressBar } from '@astryxdesign/core/ProgressBar';

/** Displays determinate or indeterminate progress with a semantic state. */
export function ProgressBar(props: {
    label: string;
    value?: number;
    max?: number;
    isLabelHidden?: boolean;
    hasValueLabel?: boolean;
    variant?: 'accent' | 'success' | 'warning' | 'error' | 'neutral';
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
