/** Props accepted by the XML br bridge component. */
export interface BrProps {
    className?: string;
}

/** Renders a spacer block for visual separation. */
export function Br({ className }: BrProps) {
    return <div aria-hidden="true" className={['h-6 w-full', className].filter(Boolean).join(' ')} />;
}
