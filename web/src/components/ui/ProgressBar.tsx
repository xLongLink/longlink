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
    return <AstryxProgressBar {...props} />;
}
