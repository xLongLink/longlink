import { StatusDot as AstryxStatusDot } from '@astryxdesign/core/StatusDot';

/** Displays a labeled semantic status without custom indicator rendering. */
export function StatusDot(props: {
    /** Hides the component without unmounting it. */
    hidden?: boolean;
    label: string;
    variant: 'success' | 'warning' | 'error' | 'accent' | 'neutral';
    tooltip?: string;
}) {
    return (
        <AstryxStatusDot
            {...props}
            className={props.hidden ? 'hidden!' : undefined}
            tooltip={props.hidden ? undefined : props.tooltip}
        />
    );
}
