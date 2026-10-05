import { StatusDot as AstryxStatusDot } from '@astryxdesign/core/StatusDot';

/** Displays a labeled semantic status without custom indicator rendering. */
export function StatusDot(props: {
    label: string;
    variant: 'success' | 'warning' | 'error' | 'accent' | 'neutral';
    tooltip?: string;
}) {
    return <AstryxStatusDot {...props} />;
}
